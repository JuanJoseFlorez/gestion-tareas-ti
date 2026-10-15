import { TestBed } from '@angular/core/testing';
import { MatSort } from '@angular/material/sort';
import { By } from '@angular/platform-browser';
import { ServiceRequest, ServiceRequestSort } from '../../models/service-request.models';
import { ServiceRequestTable, StatusChangeEvent } from './service-request-table';

const rows: ServiceRequest[] = [
  {
    id: 1,
    title: 'Impresora atascada',
    description: 'd',
    requesterName: 'Ana Gómez',
    requesterEmail: 'ana@empresa.com',
    priority: 'HIGH',
    status: 'PENDING',
    technician: null,
    serviceType: { id: 10, name: 'Mantenimiento Impresora', isActive: true },
    createdAt: '2026-10-14T10:00:00.000Z',
    updatedAt: '2026-10-14T10:00:00.000Z',
  },
  {
    id: 2,
    title: 'Plotter',
    description: 'd',
    requesterName: 'Diana',
    requesterEmail: 'diana@empresa.com',
    priority: 'LOW',
    status: 'COMPLETED',
    technician: { id: 5, fullName: 'Jorge Ramírez', isActive: false },
    serviceType: { id: 10, name: 'Mantenimiento Impresora', isActive: true },
    createdAt: '2026-10-14T11:00:00.000Z',
    updatedAt: '2026-10-14T11:00:00.000Z',
  },
];

async function setup() {
  TestBed.configureTestingModule({ imports: [ServiceRequestTable] });
  const fixture = TestBed.createComponent(ServiceRequestTable);
  fixture.componentRef.setInput('requests', rows);
  fixture.componentRef.setInput('sort', {
    sortBy: 'createdAt',
    order: 'desc',
  } satisfies ServiceRequestSort);
  await fixture.whenStable();
  return {
    fixture,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('ServiceRequestTable', () => {
  it('renders one row per request with unassigned and inactive technicians labelled', async () => {
    const { element } = await setup();
    expect(element.querySelectorAll('tr[mat-row]').length).toBe(2);
    expect(element.textContent).toContain('Sin asignar');
    expect(element.textContent).toContain('Jorge Ramírez');
    expect(element.textContent).toContain('(inactivo)');
    expect(element.textContent).toContain('Pendiente');
    expect(element.textContent).toContain('Alta');
  });

  it('emits edit and remove with the row', async () => {
    const { component, element } = await setup();
    const edited: ServiceRequest[] = [];
    const deleted: ServiceRequest[] = [];
    component.edit.subscribe((r) => edited.push(r));
    component.remove.subscribe((r) => deleted.push(r));
    (element.querySelector('button[aria-label="Editar solicitud 2"]') as HTMLButtonElement).click();
    (
      element.querySelector('button[aria-label="Eliminar solicitud 1"]') as HTMLButtonElement
    ).click();
    expect(edited.map((r) => r.id)).toEqual([2]);
    expect(deleted.map((r) => r.id)).toEqual([1]);
  });

  it('emits statusChange from the status menu, excluding the current status', async () => {
    const { component, element, fixture } = await setup();
    const changes: StatusChangeEvent[] = [];
    component.statusChange.subscribe((e) => changes.push(e));
    (
      element.querySelector(
        'button[aria-label$="Cambiar estado de la solicitud 1"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    const items = Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-item'));
    expect(items.map((i) => i.textContent?.trim())).toEqual([
      'En progreso',
      'Completada',
      'Cancelada',
    ]);
    items[0].click();
    expect(changes).toEqual([{ request: rows[0], status: 'IN_PROGRESS' }]);
  });

  it('emits sortChange when a sortable header is used', async () => {
    const { component, fixture } = await setup();
    const sorts: ServiceRequestSort[] = [];
    component.sortChange.subscribe((s) => sorts.push(s));
    fixture.debugElement
      .query(By.directive(MatSort))
      .injector.get(MatSort)
      .sort({ id: 'priority', start: 'asc', disableClear: true });
    expect(sorts).toEqual([{ sortBy: 'priority', order: 'asc' }]);
  });
});
