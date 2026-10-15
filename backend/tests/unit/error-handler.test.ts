import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Prisma } from '../../src/generated/prisma/client.js';
import { BusinessRuleError, NotFoundError } from '../../src/errors/app-errors.js';
import { toHttpError } from '../../src/middlewares/error-handler.js';

function prismaError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('db error', { code, clientVersion: '7.10.0', meta });
}

describe('toHttpError', () => {
  it('maps domain errors to their status, code and details', () => {
    const result = toHttpError(
      new BusinessRuleError('Regla violada.', [{ field: 'technicianId', message: 'Requerido.' }]),
    );
    expect(result).toEqual({
      status: 422,
      body: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'Regla violada.',
        details: [{ field: 'technicianId', message: 'Requerido.' }],
      },
    });
    expect(toHttpError(new NotFoundError('No existe.')).status).toBe(404);
  });

  it('maps ZodError to 400 with one detail per issue', () => {
    const parsed = z.object({ title: z.string(), page: z.number() }).safeParse({ page: 'x' });
    const result = toHttpError(parsed.error);
    expect(result.status).toBe(400);
    expect(result.body.code).toBe('VALIDATION_ERROR');
    expect(result.body.details?.map((d) => d.field)).toEqual(['title', 'page']);
  });

  it('uses "body" as field for issues without a path', () => {
    const parsed = z.object({}).refine(() => false, { error: 'Debe enviar al menos un campo.' }).safeParse({});
    expect(toHttpError(parsed.error).body.details).toEqual([
      { field: 'body', message: 'Debe enviar al menos un campo.' },
    ]);
  });

  it('maps Prisma P2025 to 404', () => {
    expect(toHttpError(prismaError('P2025')).status).toBe(404);
    expect(toHttpError(prismaError('P2025')).body.code).toBe('NOT_FOUND');
  });

  it('maps FK (P2003) and CHECK (P2039 / SQLSTATE 23514) violations to 422', () => {
    expect(toHttpError(prismaError('P2003')).status).toBe(422);
    const check = prismaError('P2039', { driverAdapterError: { cause: { originalCode: '23514' } } });
    expect(toHttpError(check).body.code).toBe('BUSINESS_RULE_VIOLATION');
  });

  it('maps any other Prisma error and unknown errors to 500 without leaking internals', () => {
    const other = toHttpError(prismaError('P2039', { driverAdapterError: { cause: { originalCode: '08006' } } }));
    expect(other.status).toBe(500);
    const unknown = toHttpError(new Error('connection string postgres://secret'));
    expect(unknown).toEqual({
      status: 500,
      body: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.' },
    });
  });

  it.each([
    ['entity.too.large', 413],
    ['charset.unsupported', 415],
  ])('maps body-parser %s errors to their 4xx status', (type, status) => {
    const err = Object.assign(new Error('body parser'), { type, status, expose: true });
    expect(toHttpError(err)).toEqual({
      status,
      body: { code: 'VALIDATION_ERROR', message: 'El cuerpo de la solicitud no es válido.' },
    });
  });
});
