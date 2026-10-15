import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { AppError } from '../../../../core/models/api-error.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { CatalogsService } from '../../../catalogs/services/catalogs.service';
import { EMPTY_FILTERS, ServiceRequest } from '../../models/service-request.models';
import { ServiceRequestsStore } from '../../services/service-requests-store.service';
import { ServiceRequestListPage } from './service-request-list';

const row: ServiceRequest = {
  id: 4,
  title: 'Cable de red dañado',
  description: 'd',
  requesterName: 'Sofía',
  requesterEmail: 'sofia@empresa.com',
  priority: 'MEDIUM',
  status: 'PENDING',
  technician: null,
  serviceType: { id: 1, name: 'Soporte de Red', isActive: true },
  createdAt: '2026-10-14T10:00:00.000Z',
  updatedAt: '2026-10-14T10:00:00.000Z',
};

function setup(dialogResult: unknown) {
  const store = {
    requests: signal([row]),
    meta: signal({ page: 1, pageSize: 10, total: 1, totalPages: 1 }),
    filters: signal(EMPTY_FILTERS),
    sort: signal({ sortBy: 'createdAt' as const, order: 'desc' as const }),
    loading: signal(false),
    error: signal<AppError | null>(null),
    isEmpty: signal(false),
    load: vi.fn(),
    setFilters: vi.fn(),
    setPage: vi.fn(),
    setSort: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    changeStatus: vi.fn(),
    remove: vi.fn(() => of(undefined)),
  };
  const notifications = { success: vi.fn(), error: vi.fn() };
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(dialogResult) })) };
  TestBed.configureTestingModule({
    imports: [ServiceRequestListPage],
    providers: [
      { provide: ServiceRequestsStore, useValue: store },
      { provide: CatalogsService, useValue: { technicians$: of([]), serviceTypes$: of([]) } },
      { provide: NotificationService, useValue: notifications },
      { provide: MatDialog, useValue: dialog },
    ],
  });
  const fixture = TestBed.createComponent(ServiceRequestListPage);
  return { fixture, component: fixture.componentInstance, store, notifications, dialog };
}

describe('ServiceRequestListPage', () => {
  it('loads the list on start', async () => {
    const { fixture, store } = setup(undefined);
    await fixture.whenStable();
    expect(store.load).toHaveBeenCalledTimes(1);
  });

  it('deletes only after the user confirms', async () => {
    const confirmed = setup(true);
    await confirmed.fixture.whenStable();
    confirmed.component['confirmDelete'](row);
    expect(confirmed.store.remove).toHaveBeenCalledWith(4);
    expect(confirmed.notifications.success).toHaveBeenCalledWith('Solicitud #4 eliminada.');
  });

  it('does not delete when the user cancels', async () => {
    const cancelled = setup(false);
    await cancelled.fixture.whenStable();
    cancelled.component['confirmDelete'](row);
    expect(cancelled.store.remove).not.toHaveBeenCalled();
  });

  it('shows the backend message when a quick status change fails', async () => {
    const { fixture, component, store, notifications } = setup(undefined);
    await fixture.whenStable();
    const error: AppError = {
      status: 422,
      code: 'BUSINESS_RULE_VIOLATION',
      message: 'Una solicitud en estado IN_PROGRESS debe tener un técnico asignado.',
      details: [],
    };
    store.changeStatus.mockReturnValue(throwError(() => error));
    component['changeStatus']({ request: row, status: 'IN_PROGRESS' });
    expect(notifications.error).toHaveBeenCalledWith(
      'Una solicitud en estado IN_PROGRESS debe tener un técnico asignado.',
    );
  });

  it('reloads and explains when the request no longer exists', async () => {
    const { fixture, component, store, notifications } = setup(undefined);
    await fixture.whenStable();
    store.changeStatus.mockReturnValue(
      throwError(() => ({ status: 404, code: 'NOT_FOUND', message: 'x', details: [] })),
    );
    component['changeStatus']({ request: row, status: 'CANCELLED' });
    expect(notifications.error).toHaveBeenCalledWith('La solicitud ya no existe.');
    expect(store.load).toHaveBeenCalledTimes(2);
  });

  it('shows the list load error as a notification', async () => {
    const { fixture, store, notifications } = setup(undefined);
    await fixture.whenStable();
    store.error.set({ status: 0, code: 'NETWORK_ERROR', message: 'Sin conexión', details: [] });
    await fixture.whenStable();
    expect(notifications.error).toHaveBeenCalledWith('Sin conexión');
  });
});
