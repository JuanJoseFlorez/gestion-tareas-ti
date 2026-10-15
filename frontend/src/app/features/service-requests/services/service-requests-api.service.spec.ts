import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ServiceRequestInput } from '../models/service-request.models';
import { ServiceRequestsApiService } from './service-requests-api.service';

const URL = `${environment.apiUrl}/service-requests`;

const input: ServiceRequestInput = {
  title: 'Instalar Office',
  description: 'Equipo nuevo',
  requesterName: 'Carlos Ruiz',
  requesterEmail: 'carlos@empresa.com',
  priority: 'MEDIUM',
  status: 'PENDING',
  technicianId: null,
  serviceTypeId: 2,
};

describe('ServiceRequestsApiService', () => {
  let api: ServiceRequestsApiService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ServiceRequestsApiService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('list sends only defined query params', () => {
    api
      .list({
        search: 'impresora',
        technicianId: 'unassigned',
        status: undefined,
        page: 2,
        pageSize: 10,
      })
      .subscribe();
    const req = controller.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual([
      'page',
      'pageSize',
      'search',
      'technicianId',
    ]);
    expect(req.request.params.get('technicianId')).toBe('unassigned');
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ data: [], meta: { page: 2, pageSize: 10, total: 0, totalPages: 0 } });
  });

  it('getById, create, replace, patch and remove use the right method and URL', () => {
    api.getById(5).subscribe();
    expect(controller.expectOne(`${URL}/5`).request.method).toBe('GET');

    api.create(input).subscribe();
    const create = controller.expectOne(URL);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(input);

    api.replace(5, input).subscribe();
    const replace = controller.expectOne(`${URL}/5`);
    expect(replace.request.method).toBe('PUT');
    expect(replace.request.body).toEqual(input);

    api.patch(5, { status: 'COMPLETED' }).subscribe();
    const patch = controller.expectOne(`${URL}/5`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ status: 'COMPLETED' });

    api.remove(5).subscribe();
    expect(controller.expectOne(`${URL}/5`).request.method).toBe('DELETE');
  });
});
