import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppError } from '../models/api-error.model';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let received: AppError | undefined;
  let logged: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    received = undefined;
    http.get('/api/x').subscribe({ error: (error: AppError) => (received = error) });
  });

  afterEach(() => {
    controller.verify();
    vi.restoreAllMocks();
  });

  it('maps the backend error body to an AppError', () => {
    controller.expectOne('/api/x').flush(
      {
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: 'Una solicitud en estado IN_PROGRESS debe tener un técnico asignado.',
          details: [
            {
              field: 'technicianId',
              message: 'Requerido cuando el estado es IN_PROGRESS o COMPLETED.',
            },
          ],
        },
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    expect(received).toEqual({
      status: 422,
      code: 'BUSINESS_RULE_VIOLATION',
      message: 'Una solicitud en estado IN_PROGRESS debe tener un técnico asignado.',
      details: [
        {
          field: 'technicianId',
          message: 'Requerido cuando el estado es IN_PROGRESS o COMPLETED.',
        },
      ],
    });
  });

  it('defaults details to an empty array', () => {
    controller
      .expectOne('/api/x')
      .flush(
        { error: { code: 'NOT_FOUND', message: 'La solicitud no existe.' } },
        { status: 404, statusText: 'Not Found' },
      );
    expect(received).toEqual({
      status: 404,
      code: 'NOT_FOUND',
      message: 'La solicitud no existe.',
      details: [],
    });
  });

  it('maps a network failure (status 0) to NETWORK_ERROR', () => {
    controller.expectOne('/api/x').error(new ProgressEvent('error'));
    expect(received).toEqual({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.',
      details: [],
    });
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it('logs a well-formed backend 500 once', () => {
    controller
      .expectOne('/api/x')
      .flush(
        { error: { code: 'INTERNAL_ERROR', message: 'Error interno.' } },
        { status: 500, statusText: 'Server Error' },
      );
    expect(received).toEqual({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Error interno.',
      details: [],
    });
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it('maps a non-API error body (e.g. proxy 502) to a generic INTERNAL_ERROR', () => {
    controller.expectOne('/api/x').flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });
    expect(received).toEqual({
      status: 502,
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
      details: [],
    });
    expect(logged).toHaveBeenCalledTimes(1);
  });
});
