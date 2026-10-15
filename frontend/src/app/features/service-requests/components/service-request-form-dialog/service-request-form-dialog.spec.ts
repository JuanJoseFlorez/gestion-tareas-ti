import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';
import { AppError } from '../../../../core/models/api-error.model';
import { ServiceType, Technician } from '../../../catalogs/models/catalog.models';
import { ServiceRequest } from '../../models/service-request.models';
import {
  ServiceRequestFormDialog,
  ServiceRequestFormDialogData,
} from './service-request-form-dialog';

const technicians: Technician[] = [
  { id: 1, fullName: 'Pedro Pérez', email: 'p@e.com', isActive: true },
  { id: 2, fullName: 'Jorge Ramírez', email: 'j@e.com', isActive: false },
];
const serviceTypes: ServiceType[] = [
  { id: 10, name: 'Soporte de Red', description: null, isActive: true },
];

const existing: ServiceRequest = {
  id: 7,
  title: 'Plotter',
  description: 'Revisión',
  requesterName: 'Diana',
  requesterEmail: 'diana@empresa.com',
  priority: 'LOW',
  status: 'COMPLETED',
  technician: { id: 2, fullName: 'Jorge Ramírez', isActive: false },
  serviceType: { id: 10, name: 'Soporte de Red', isActive: true },
  createdAt: '2026-10-14T10:00:00.000Z',
  updatedAt: '2026-10-14T10:00:00.000Z',
};

async function setup(overrides: Partial<ServiceRequestFormDialogData> = {}) {
  const close = vi.fn();
  const dialogRef = { close, disableClose: false };
  const data: ServiceRequestFormDialogData = {
    request: null,
    technicians,
    serviceTypes,
    save: vi.fn(() => of(existing)),
    ...overrides,
  };
  TestBed.configureTestingModule({
    imports: [ServiceRequestFormDialog],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: dialogRef },
    ],
  });
  const fixture = TestBed.createComponent(ServiceRequestFormDialog);
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, data, close, dialogRef };
}

function fillValid(component: ServiceRequestFormDialog) {
  component.form.setValue({
    title: '  Instalar Office  ',
    description: 'Equipo nuevo',
    requesterName: 'Carlos Ruiz',
    requesterEmail: ' carlos@empresa.com ',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    technicianId: 1,
    serviceTypeId: 10,
  });
}

describe('ServiceRequestFormDialog', () => {
  it('starts in create mode with defaults and is invalid until filled', async () => {
    const { component, fixture } = await setup();
    expect(component.form.getRawValue()).toMatchObject({
      priority: 'MEDIUM',
      status: 'PENDING',
      technicianId: null,
      serviceTypeId: null,
    });
    expect(component.form.invalid).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nueva solicitud');
  });

  it('prefills edit mode and offers the inactive current technician', async () => {
    const { component, fixture } = await setup({ request: existing });
    expect(component.form.getRawValue()).toMatchObject({
      title: 'Plotter',
      status: 'COMPLETED',
      technicianId: 2,
      serviceTypeId: 10,
    });
    expect(component['technicianOptions']).toEqual([
      { id: 1, label: 'Pedro Pérez' },
      { id: 2, label: 'Jorge Ramírez (inactivo)' },
    ]);
    expect(component.form.valid).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Editar solicitud #7');
  });

  it('requires a technician for IN_PROGRESS', async () => {
    const { component } = await setup();
    fillValid(component);
    component.form.controls.technicianId.setValue(null);
    expect(component.form.hasError('technicianRequired')).toBe(true);
    component.form.controls.status.setValue('PENDING');
    expect(component.form.hasError('technicianRequired')).toBe(false);
  });

  it('rejects blank text and an email without a domain suffix', async () => {
    const { component } = await setup();
    fillValid(component);
    component.form.controls.title.setValue('   ');
    component.form.controls.requesterEmail.setValue('ana@empresa');
    expect(component.form.controls.title.hasError('blank')).toBe(true);
    expect(component.form.controls.requesterEmail.hasError('pattern')).toBe(true);
  });

  it('submits trimmed input and closes with the saved request', async () => {
    const { component, data, close } = await setup();
    fillValid(component);
    component.submit();
    expect(data.save).toHaveBeenCalledWith({
      title: 'Instalar Office',
      description: 'Equipo nuevo',
      requesterName: 'Carlos Ruiz',
      requesterEmail: 'carlos@empresa.com',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      technicianId: 1,
      serviceTypeId: 10,
    });
    expect(close).toHaveBeenCalledWith(existing);
  });

  it('ignores a second submit while the first is in flight', async () => {
    const pending = new Subject<ServiceRequest>();
    const { component, data } = await setup({ save: vi.fn(() => pending.asObservable()) });
    fillValid(component);
    component.submit();
    component.submit();
    expect(data.save).toHaveBeenCalledTimes(1);
  });

  it('maps server field errors to controls and stays open', async () => {
    const error: AppError = {
      status: 422,
      code: 'BUSINESS_RULE_VIOLATION',
      message: 'La solicitud no se puede asignar con los datos enviados.',
      details: [
        {
          field: 'technicianId',
          message: 'El técnico está inactivo y no puede recibir nuevas asignaciones.',
        },
      ],
    };
    const { component, close, fixture } = await setup({
      save: vi.fn(() => throwError(() => error)),
    });
    fillValid(component);
    component.submit();
    await fixture.whenStable();
    expect(component.form.controls.technicianId.errors?.['server']).toBe(
      'El técnico está inactivo y no puede recibir nuevas asignaciones.',
    );
    expect(close).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'La solicitud no se puede asignar con los datos enviados.',
    );
  });

  it('blocks closing while saving and releases it after a failure', async () => {
    const pending = new Subject<ServiceRequest>();
    const { component, dialogRef } = await setup({ save: vi.fn(() => pending.asObservable()) });
    fillValid(component);
    component.submit();
    expect(dialogRef.disableClose).toBe(true);
    pending.error({ status: 500, code: 'NETWORK_ERROR', message: 'boom', details: [] } as AppError);
    expect(dialogRef.disableClose).toBe(false);
  });

  it('disables the save button when invalid, enables it when valid and disables it while saving', async () => {
    const pending = new Subject<ServiceRequest>();
    const { component, fixture } = await setup({ save: vi.fn(() => pending.asObservable()) });
    const button = () =>
      (fixture.nativeElement as HTMLElement).querySelector(
        'button[type=submit]',
      ) as HTMLButtonElement;
    expect(button().disabled).toBe(true);
    fillValid(component);
    await fixture.whenStable();
    expect(button().disabled).toBe(false);
    component.submit();
    await fixture.whenStable();
    expect(button().disabled).toBe(true);
  });
});
