import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { createCatalogFixtures, createServiceRequest, resetDatabase } from '../helpers/db.js';

let fx: Awaited<ReturnType<typeof createCatalogFixtures>>;

function body(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Instalar Office en equipo nuevo',
    description: 'Equipo nuevo del área contable requiere Microsoft Office.',
    requesterName: 'Carlos Ruiz',
    requesterEmail: 'carlos.ruiz@empresa.com',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    technicianId: fx.pedro.id,
    serviceTypeId: fx.software.id,
    ...overrides,
  };
}

beforeEach(async () => {
  await resetDatabase();
  fx = await createCatalogFixtures();
});

describe('POST /api/v1/service-requests', () => {
  it('creates a request: 201, Location header and contract body', async () => {
    const res = await request(app).post('/api/v1/service-requests').send(body({ title: '  Instalar Office en equipo nuevo  ', id: 999 }));
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/v1/service-requests/${res.body.id}`);
    expect(res.body).toMatchObject({
      title: 'Instalar Office en equipo nuevo',
      status: 'IN_PROGRESS',
      technician: { id: fx.pedro.id, fullName: 'Pedro Pérez', isActive: true },
      serviceType: { id: fx.software.id, name: 'Instalación de Software', isActive: true },
    });
    expect(res.body.id).not.toBe(999);
    expect(res.body).not.toHaveProperty('technicianId');
    expect(await prisma.serviceRequest.count()).toBe(1);
  });

  it('answers 422 when IN_PROGRESS has no technician', async () => {
    const res = await request(app).post('/api/v1/service-requests').send(body({ technicianId: null }));
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'Una solicitud en estado IN_PROGRESS debe tener un técnico asignado.',
        details: [{ field: 'technicianId', message: 'Requerido cuando el estado es IN_PROGRESS o COMPLETED.' }],
      },
    });
  });

  it('answers 422 for an inactive technician or a missing service type', async () => {
    const inactive = await request(app).post('/api/v1/service-requests').send(body({ technicianId: fx.jorge.id }));
    expect(inactive.status).toBe(422);
    expect(inactive.body.error.details[0].field).toBe('technicianId');
    const missing = await request(app).post('/api/v1/service-requests').send(body({ serviceTypeId: 9999 }));
    expect(missing.status).toBe(422);
    expect(missing.body.error.details[0].field).toBe('serviceTypeId');
  });

  it('answers 400 with field details for invalid or missing fields', async () => {
    const { technicianId: _omitted, ...withoutTechnician } = body({ title: '   ', requesterEmail: 'nope' });
    const res = await request(app).post('/api/v1/service-requests').send(withoutTechnician);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(['requesterEmail', 'technicianId', 'title']);
    expect(await prisma.serviceRequest.count()).toBe(0);
  });
});

describe('PUT /api/v1/service-requests/:id', () => {
  it('replaces the request', async () => {
    const existing = await createServiceRequest({ serviceTypeId: fx.printer.id });
    const res = await request(app).put(`/api/v1/service-requests/${existing.id}`).send(body({ priority: 'HIGH' }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: existing.id, priority: 'HIGH', status: 'IN_PROGRESS', technician: { id: fx.pedro.id } });
  });

  it('keeps an inactive technician that was already assigned', async () => {
    const existing = await createServiceRequest({ status: 'COMPLETED', technicianId: fx.jorge.id, serviceTypeId: fx.printer.id });
    const res = await request(app)
      .put(`/api/v1/service-requests/${existing.id}`)
      .send(body({ status: 'COMPLETED', technicianId: fx.jorge.id, serviceTypeId: fx.printer.id, priority: 'LOW' }));
    expect(res.status).toBe(200);
    expect(res.body.technician).toEqual({ id: fx.jorge.id, fullName: 'Jorge Ramírez', isActive: false });
  });

  it('answers 422 when reassigning to an inactive technician and 404 for a missing id', async () => {
    const existing = await createServiceRequest({ serviceTypeId: fx.printer.id });
    const inactive = await request(app).put(`/api/v1/service-requests/${existing.id}`).send(body({ technicianId: fx.jorge.id }));
    expect(inactive.status).toBe(422);
    const missing = await request(app).put('/api/v1/service-requests/9999').send(body());
    expect(missing.status).toBe(404);
  });

  it('requires the full body', async () => {
    const existing = await createServiceRequest({ serviceTypeId: fx.printer.id });
    const res = await request(app).put(`/api/v1/service-requests/${existing.id}`).send({ priority: 'HIGH' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/service-requests/:id', () => {
  it('updates only the given fields', async () => {
    const existing = await createServiceRequest({ title: 'Original', serviceTypeId: fx.printer.id });
    const res = await request(app).patch(`/api/v1/service-requests/${existing.id}`).send({ priority: 'HIGH' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Original', priority: 'HIGH', status: 'PENDING' });
  });

  it('answers 422 when moving an unassigned request to IN_PROGRESS', async () => {
    const existing = await createServiceRequest({ serviceTypeId: fx.printer.id });
    const res = await request(app).patch(`/api/v1/service-requests/${existing.id}`).send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].field).toBe('technicianId');
  });

  it('answers 400 for an empty body', async () => {
    const existing = await createServiceRequest({ serviceTypeId: fx.printer.id });
    const res = await request(app).patch(`/api/v1/service-requests/${existing.id}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: 'body', message: 'Debe enviar al menos un campo.' }]);
  });
});

describe('DELETE /api/v1/service-requests/:id', () => {
  it('deletes the request: 204 with empty body, then 404', async () => {
    const existing = await createServiceRequest({ serviceTypeId: fx.printer.id });
    const res = await request(app).delete(`/api/v1/service-requests/${existing.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect((await request(app).get(`/api/v1/service-requests/${existing.id}`)).status).toBe(404);
  });

  it('answers 404 for a missing id and 400 for an invalid id', async () => {
    expect((await request(app).delete('/api/v1/service-requests/9999')).status).toBe(404);
    expect((await request(app).delete('/api/v1/service-requests/abc')).status).toBe(400);
  });
});
