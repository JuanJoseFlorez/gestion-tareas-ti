import { describe, expect, it } from 'vitest';
import {
  idParamSchema,
  serviceRequestInputSchema,
  serviceRequestListQuerySchema,
  serviceRequestPatchSchema,
} from '../../src/schemas/service-request.schemas.js';

const validInput = {
  title: 'Instalar Office',
  description: 'Equipo nuevo del área contable.',
  requesterName: 'Carlos Ruiz',
  requesterEmail: 'carlos.ruiz@empresa.com',
  priority: 'MEDIUM',
  status: 'PENDING',
  technicianId: null,
  serviceTypeId: 2,
};

function fieldErrors(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return Object.fromEntries((result.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));
}

describe('serviceRequestInputSchema', () => {
  it('accepts a valid body, trims strings and strips server-managed fields', () => {
    const result = serviceRequestInputSchema.safeParse({
      ...validInput,
      title: '  Instalar Office  ',
      requesterEmail: ' carlos.ruiz@empresa.com ',
      id: 99,
      createdAt: '2020-01-01',
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ...validInput, title: 'Instalar Office' });
  });

  it('rejects blank strings with a Spanish required message', () => {
    const errors = fieldErrors(serviceRequestInputSchema.safeParse({ ...validInput, title: '   ', description: '' }));
    expect(errors).toEqual({ title: 'Es obligatorio.', description: 'Es obligatorio.' });
  });

  it('enforces max lengths', () => {
    const errors = fieldErrors(
      serviceRequestInputSchema.safeParse({
        ...validInput,
        title: 'a'.repeat(151),
        description: 'a'.repeat(2001),
        requesterName: 'a'.repeat(121),
      }),
    );
    expect(errors).toEqual({
      title: 'Debe tener máximo 150 caracteres.',
      description: 'Debe tener máximo 2000 caracteres.',
      requesterName: 'Debe tener máximo 120 caracteres.',
    });
  });

  it('rejects an invalid email', () => {
    const errors = fieldErrors(serviceRequestInputSchema.safeParse({ ...validInput, requesterEmail: 'carlos@empresa' }));
    expect(errors).toEqual({ requesterEmail: 'Debe ser un correo electrónico válido.' });
  });

  it('rejects unknown enum values', () => {
    const errors = fieldErrors(serviceRequestInputSchema.safeParse({ ...validInput, status: 'DONE', priority: 'URGENT' }));
    expect(errors).toEqual({ status: 'Estado no válido.', priority: 'Prioridad no válida.' });
  });

  it('requires the technicianId key even though null is allowed', () => {
    const { technicianId: _omitted, ...withoutTechnician } = validInput;
    const errors = fieldErrors(serviceRequestInputSchema.safeParse(withoutTechnician));
    expect(Object.keys(errors)).toEqual(['technicianId']);
  });

  it('rejects ids sent as strings', () => {
    const errors = fieldErrors(serviceRequestInputSchema.safeParse({ ...validInput, technicianId: '3', serviceTypeId: '2' }));
    expect(Object.keys(errors).sort()).toEqual(['serviceTypeId', 'technicianId']);
  });

  it('rejects ids above the PostgreSQL INTEGER limit', () => {
    const errors = fieldErrors(serviceRequestInputSchema.safeParse({ ...validInput, serviceTypeId: 2147483648 }));
    expect(Object.keys(errors)).toEqual(['serviceTypeId']);
  });
});

describe('serviceRequestPatchSchema', () => {
  it('accepts a subset of fields', () => {
    expect(serviceRequestPatchSchema.parse({ status: 'COMPLETED' })).toEqual({ status: 'COMPLETED' });
    expect(serviceRequestPatchSchema.parse({ technicianId: null })).toEqual({ technicianId: null });
  });

  it('rejects an empty body', () => {
    const result = serviceRequestPatchSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Debe enviar al menos un campo.');
  });

  it('still validates the fields it receives', () => {
    expect(serviceRequestPatchSchema.safeParse({ title: '  ' }).success).toBe(false);
  });
});

describe('serviceRequestListQuerySchema', () => {
  it('applies defaults', () => {
    expect(serviceRequestListQuerySchema.parse({})).toEqual({ sortBy: 'createdAt', order: 'desc', page: 1, pageSize: 10 });
  });

  it('coerces numeric params and accepts technicianId=unassigned', () => {
    expect(serviceRequestListQuerySchema.parse({ technicianId: '3', serviceTypeId: '2', page: '2', pageSize: '25' })).toMatchObject({
      technicianId: 3,
      serviceTypeId: 2,
      page: 2,
      pageSize: 25,
    });
    expect(serviceRequestListQuerySchema.parse({ technicianId: 'unassigned' }).technicianId).toBe('unassigned');
  });

  it('drops a blank search and trims a non-blank one', () => {
    expect(serviceRequestListQuerySchema.parse({ search: '   ' }).search).toBeUndefined();
    expect(serviceRequestListQuerySchema.parse({ search: '  impresora ' }).search).toBe('impresora');
  });

  it('rejects invalid values', () => {
    for (const query of [
      { status: 'FOO' },
      { technicianId: '0' },
      { technicianId: '2147483648' },
      { page: '0' },
      { pageSize: '101' },
      { sortBy: 'title' },
      { order: 'up' },
      { search: 'a'.repeat(101) },
      { status: ['PENDING', 'COMPLETED'] },
    ]) {
      expect(serviceRequestListQuerySchema.safeParse(query).success, JSON.stringify(query)).toBe(false);
    }
  });
});

describe('idParamSchema', () => {
  it('coerces a positive integer id and rejects anything else', () => {
    expect(idParamSchema.parse({ id: '42' })).toEqual({ id: 42 });
    for (const id of ['abc', '0', '-1', '1.5', '2147483648']) {
      expect(idParamSchema.safeParse({ id }).success, id).toBe(false);
    }
  });
});
