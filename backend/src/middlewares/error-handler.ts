import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, NotFoundError, type ErrorCode, type ErrorDetail } from '../errors/app-errors.js';
import { Prisma } from '../generated/prisma/client.js';

interface HttpError {
  status: number;
  body: { code: ErrorCode; message: string; details?: ErrorDetail[] };
}

const CHECK_VIOLATION_SQLSTATE = '23514';

// body-parser marks invalid JSON bodies with this type
function isMalformedJson(err: unknown): boolean {
  return err instanceof SyntaxError && 'type' in err && err.type === 'entity.parse.failed';
}

// With driver adapters Prisma reports CHECK violations as P2039 and keeps the SQLSTATE in meta
function isCheckViolation(err: Prisma.PrismaClientKnownRequestError): boolean {
  const adapterError = err.meta?.driverAdapterError as { cause?: { originalCode?: string } } | undefined;
  return err.code === 'P2039' && adapterError?.cause?.originalCode === CHECK_VIOLATION_SQLSTATE;
}

export function toHttpError(err: unknown): HttpError {
  if (err instanceof AppError) {
    return { status: err.status, body: { code: err.code, message: err.message, details: err.details } };
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        code: 'VALIDATION_ERROR',
        message: 'La solicitud contiene datos inválidos.',
        details: err.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })),
      },
    };
  }
  if (isMalformedJson(err)) {
    return { status: 400, body: { code: 'VALIDATION_ERROR', message: 'El cuerpo de la solicitud no es un JSON válido.' } };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      return { status: 404, body: { code: 'NOT_FOUND', message: 'El recurso solicitado no existe.' } };
    }
    // Last-resort guards: the services validate first, these only fire on races
    if (err.code === 'P2003' || isCheckViolation(err)) {
      return {
        status: 422,
        body: { code: 'BUSINESS_RULE_VIOLATION', message: 'La operación viola una regla de integridad de los datos.' },
      };
    }
  }
  return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.' } };
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError('El recurso solicitado no existe.'));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const { status, body } = toHttpError(err);
  if (status === 500) {
    console.error(err);
  }
  res.status(status).json({ error: body });
};
