import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AppError } from '../../../core/models/api-error.model';
import { PaginatedResponse } from '../../../core/models/paginated-response.model';
import {
  EMPTY_FILTERS,
  ServiceRequest,
  ServiceRequestListQuery,
} from '../models/service-request.models';
import { ServiceRequestsApiService } from './service-requests-api.service';
import { ServiceRequestsStore } from './service-requests-store.service';

function request(id: number, overrides: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id,
    title: `Solicitud ${id}`,
    description: 'Descripción',
    requesterName: 'Ana',
    requesterEmail: 'ana@empresa.com',
    priority: 'MEDIUM',
    status: 'PENDING',
    technician: null,
    serviceType: { id: 1, name: 'Soporte de Red', isActive: true },
    createdAt: '2026-10-14T10:00:00.000Z',
    updatedAt: '2026-10-14T10:00:00.000Z',
    ...overrides,
  };
}

function page(
  data: ServiceRequest[],
  meta: Partial<PaginatedResponse<ServiceRequest>['meta']> = {},
) {
  return {
    data,
    meta: { page: 1, pageSize: 10, total: data.length, totalPages: data.length ? 1 : 0, ...meta },
  };
}

describe('ServiceRequestsStore', () => {
  let api: { [K in keyof ServiceRequestsApiService]: ReturnType<typeof vi.fn> };
  let store: ServiceRequestsStore;

  beforeEach(() => {
    api = {
      list: vi.fn((query: ServiceRequestListQuery) =>
        of(page([request(1), request(2)], { page: query.page, pageSize: query.pageSize })),
      ),
      getById: vi.fn(),
      create: vi.fn(() => of(request(3))),
      replace: vi.fn(() => of(request(1))),
      patch: vi.fn(() => of(request(1, { status: 'COMPLETED' }))),
      remove: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: ServiceRequestsApiService, useValue: api }],
    });
    store = TestBed.inject(ServiceRequestsStore);
  });

  it('load fetches with default sort and pagination and stores the result', () => {
    store.load();
    expect(api.list).toHaveBeenCalledWith({
      search: undefined,
      status: undefined,
      priority: undefined,
      technicianId: undefined,
      serviceTypeId: undefined,
      sortBy: 'createdAt',
      order: 'desc',
      page: 1,
      pageSize: 10,
    });
    expect(store.requests().map((r) => r.id)).toEqual([1, 2]);
    expect(store.meta().total).toBe(2);
    expect(store.loading()).toBe(false);
    expect(store.isEmpty()).toBe(false);
  });

  it('setFilters resets to page 1 and sends trimmed, defined filters', () => {
    store.setPage(3, 25);
    store.setFilters({
      ...EMPTY_FILTERS,
      search: '  red  ',
      technicianId: 'unassigned',
      status: 'PENDING',
    });
    expect(api.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'red',
        technicianId: 'unassigned',
        status: 'PENDING',
        page: 1,
        pageSize: 25,
      }),
    );
  });

  it('setSort resets to page 1', () => {
    store.setPage(2, 10);
    store.setSort({ sortBy: 'priority', order: 'asc' });
    expect(api.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortBy: 'priority', order: 'asc', page: 1 }),
    );
  });

  it('steps back to the last existing page when the current page comes back empty', () => {
    api.list
      .mockReturnValueOnce(of(page([], { page: 3, total: 21, totalPages: 2 })))
      .mockReturnValueOnce(of(page([request(21)], { page: 2, total: 21, totalPages: 2 })));
    store.setPage(3, 10);
    expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    expect(store.requests().map((r) => r.id)).toEqual([21]);
    expect(store.meta().page).toBe(2);
  });

  it('does not re-request the same page when an empty page is not beyond totalPages', () => {
    api.list.mockReturnValue(of(page([], { page: 2, total: 0, totalPages: 2 })));
    store.setPage(2, 10);
    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('stores the error and stops loading when the list fails', () => {
    const error: AppError = {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Sin conexión',
      details: [],
    };
    api.list.mockReturnValueOnce(throwError(() => error));
    store.load();
    expect(store.error()).toEqual(error);
    expect(store.loading()).toBe(false);
  });

  it('reloads the list after create, update, status change and remove', () => {
    store.create(request(3) as never).subscribe();
    store.update(1, request(1) as never).subscribe();
    store.changeStatus(1, 'COMPLETED').subscribe();
    store.remove(2).subscribe();
    expect(api.patch).toHaveBeenCalledWith(1, { status: 'COMPLETED' });
    expect(api.list).toHaveBeenCalledTimes(4);
  });

  it('does not reload or change data when a status change fails', () => {
    store.load();
    const before = store.requests();
    const error: AppError = {
      status: 422,
      code: 'BUSINESS_RULE_VIOLATION',
      message: 'Debe tener técnico',
      details: [],
    };
    api.patch.mockReturnValueOnce(throwError(() => error));
    let received: AppError | undefined;
    store.changeStatus(1, 'IN_PROGRESS').subscribe({ error: (e: AppError) => (received = e) });
    expect(received).toEqual(error);
    expect(store.requests()).toBe(before);
    expect(api.list).toHaveBeenCalledTimes(1);
  });
});
