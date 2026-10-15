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
    // Network failures and backend 5xx are logged; 4xx are expected user-facing errors
    if (error.status === 0 || error.status >= 500) {
      console.error(error);
    }
    if (error.status === 0) {
      return { status: 0, code: 'NETWORK_ERROR', message: NETWORK_MESSAGE, details: [] };
    }
    if (isApiError(error.error)) {
      const { code, message, details } = error.error.error;
      return { status: error.status, code, message, details: details ?? [] };
    }
    // Not an API error (proxy page, bug): log it (unless already logged above), show a generic message
    if (error.status < 500) {
      console.error(error);
    }
    return {
      status: error.status,
      code: 'INTERNAL_ERROR',
      message: UNEXPECTED_MESSAGE,
      details: [],
    };
  }
  console.error(error);
  return { status: 0, code: 'INTERNAL_ERROR', message: UNEXPECTED_MESSAGE, details: [] };
}

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error: unknown) => throwError(() => toAppError(error))));
