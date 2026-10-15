import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError, AppError } from '../models/api-error.model';

const NETWORK_MESSAGE =
  'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.';
const UNEXPECTED_MESSAGE = 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';

function isApiError(body: unknown): body is ApiError {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as ApiError).error?.code === 'string'
  );
}

export function toAppError(error: unknown): AppError {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return { status: 0, code: 'NETWORK_ERROR', message: NETWORK_MESSAGE, details: [] };
    }
    if (isApiError(error.error)) {
      const { code, message, details } = error.error.error;
      return { status: error.status, code, message, details: details ?? [] };
    }
  }
  // Not an API error (proxy page, bug): log it, show a generic message
  console.error(error);
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  return { status, code: 'INTERNAL_ERROR', message: UNEXPECTED_MESSAGE, details: [] };
}

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error: unknown) => throwError(() => toAppError(error))));
