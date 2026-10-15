import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { defer, of, throwError } from 'rxjs';
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

const serviceType = { id: 1, name: 'Soporte de Red', description: null, isActive: true };

function setup(dialogResult: unknown, catalogs?: Partial<CatalogsService>) {
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
  const close = vi.fn();
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(dialogResult), close })) };
  TestBed.configureTestingModule({
    imports: [ServiceRequestListPage],
    providers: [
      { provide: ServiceRequestsStore, useValue: store },
      {
        provide: CatalogsService,
        useValue: catalogs ?? { technicians$: of([]), serviceTypes$: of([serviceType]) },
      },
      { provide: NotificationService, useValue: notifications },
      { provide: MatDialog, useValue: dialog },
    ],
  });
  const fixture = TestBed.createComponent(ServiceRequestListPage);
  return { fixture, component: fixture.componentInstance, store, notifications, dialog, close };
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

  it('shows an error state with retry instead of "no results" when the load fails', async () => {
    const { fixture, store } = setup(undefined);
    store.requests.set([]);
    store.isEmpty.set(true);
    store.error.set({ status: 0, code: 'NETWORK_ERROR', message: 'Sin conexión', details: [] });
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Sin conexión');
    expect(el.textContent).not.toContain('No hay solicitudes');
    const retry = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reintentar'),
    )!;
    expect(retry).toBeTruthy();
    retry.click();
    expect(store.load).toHaveBeenCalledTimes(2);
  });

  it('closes the dialog, notifies and reloads when editing a request that no longer exists', async () => {
    const { fixture, component, store, notifications, dialog, close } = setup(undefined);
    await fixture.whenStable();
    store.update.mockReturnValue(
      throwError(() => ({ status: 404, code: 'NOT_FOUND', message: 'x', details: [] })),
    );
    component['openEdit'](row);
    const data = (dialog.open.mock.calls[0] as unknown as [unknown, { data: any }])[1].data;
    let failed = false;
    data.save({}).subscribe({ error: () => (failed = true) });
    expect(notifications.error).toHaveBeenCalledWith('La solicitud ya no existe.');
    expect(store.load).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalled();
    expect(failed).toBe(true);
  });

  it('keeps the dialog open and silent on other edit errors', async () => {
    const { fixture, component, store, notifications, dialog, close } = setup(undefined);
    await fixture.whenStable();
    store.update.mockReturnValue(
      throwError(() => ({ status: 422, code: 'VALIDATION_ERROR', message: 'x', details: [] })),
    );
    component['openEdit'](row);
    const data = (dialog.open.mock.calls[0] as unknown as [unknown, { data: any }])[1].data;
    let failed = false;
    data.save({}).subscribe({ error: () => (failed = true) });
    expect(close).not.toHaveBeenCalled();
    expect(notifications.error).not.toHaveBeenCalled();
    expect(failed).toBe(true);
  });

  it('notifies once when the catalogs fail and loads them again on retry', async () => {
    let attempt = 0;
    const failOnce = <T>(value: T) =>
      defer(() => (attempt === 0 ? throwError(() => new Error('down')) : of(value)));
    const { fixture, store, notifications } = setup(undefined, {
      technicians$: failOnce([]),
      serviceTypes$: failOnce([serviceType]),
    });
    store.requests.set([]);
    store.isEmpty.set(true);
    store.error.set({ status: 0, code: 'NETWORK_ERROR', message: 'Sin conexión', details: [] });
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const button = (text: string) =>
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text))!;
    const catalogErrors = () =>
      notifications.error.mock.calls.filter(([m]) => String(m).includes('catálogos'));
    expect(catalogErrors()).toHaveLength(1);
    expect(button('Nueva solicitud').disabled).toBe(true);
    attempt = 1;
    button('Reintentar').click();
    await fixture.whenStable();
    expect(store.load).toHaveBeenCalledTimes(2);
    expect(button('Nueva solicitud').disabled).toBe(false);
    expect(catalogErrors()).toHaveLength(1);
  });
});
