import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormGroupDirective,
  NgForm,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ErrorStateMatcher } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Observable, finalize } from 'rxjs';
import { AppError } from '../../../../core/models/api-error.model';
import { ServiceType, Technician } from '../../../catalogs/models/catalog.models';
import {
  PRIORITY_LABELS,
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
  STATUS_LABELS,
} from '../../models/service-request.labels';
import {
  RequestPriority,
  RequestStatus,
  ServiceRequest,
  ServiceRequestInput,
} from '../../models/service-request.models';
import { notBlankValidator } from '../../validators/not-blank.validator';
import { technicianRequiredValidator } from '../../validators/technician-required.validator';
import { buildAssignableOptions } from './assignable-options';

export interface ServiceRequestFormDialogData {
  /** null = create mode */
  request: ServiceRequest | null;
  technicians: Technician[];
  serviceTypes: ServiceType[];
  /** Performed by the dialog so it can stay open and show field errors on failure */
  save: (input: ServiceRequestInput) => Observable<ServiceRequest>;
}

// Same rule as the backend (z.email requires a domain suffix; Validators.email accepts "ana@empresa").
// Surrounding whitespace is allowed because the value is trimmed before sending, like the backend does.
const EMAIL_PATTERN = /^\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*$/;

/** Shows the group-level technicianRequired error on the technician select once the user interacted. */
class TechnicianErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: AbstractControl | null, form: FormGroupDirective | NgForm | null): boolean {
    if (!control) {
      return false;
    }
    const interacted =
      control.touched || !!control.parent?.get('status')?.dirty || !!form?.submitted;
    return interacted && (control.invalid || !!control.parent?.hasError('technicianRequired'));
  }
}

@Component({
  selector: 'app-service-request-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './service-request-form-dialog.html',
  styleUrl: './service-request-form-dialog.scss',
})
export class ServiceRequestFormDialog {
  protected readonly data = inject<ServiceRequestFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<ServiceRequestFormDialog, ServiceRequest>>(MatDialogRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly statuses = REQUEST_STATUSES;
  protected readonly priorities = REQUEST_PRIORITIES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly technicianErrorMatcher = new TechnicianErrorStateMatcher();
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly technicianOptions = buildAssignableOptions(
    this.data.technicians.map((t) => ({ id: t.id, label: t.fullName, isActive: t.isActive })),
    this.data.request?.technician
      ? {
          id: this.data.request.technician.id,
          label: this.data.request.technician.fullName,
          isActive: this.data.request.technician.isActive,
        }
      : null,
  );

  protected readonly serviceTypeOptions = buildAssignableOptions(
    this.data.serviceTypes.map((s) => ({ id: s.id, label: s.name, isActive: s.isActive })),
    this.data.request
      ? {
          id: this.data.request.serviceType.id,
          label: this.data.request.serviceType.name,
          isActive: this.data.request.serviceType.isActive,
        }
      : null,
  );

  readonly form = this.fb.group(
    {
      title: ['', [Validators.required, Validators.maxLength(150), notBlankValidator]],
      description: ['', [Validators.required, Validators.maxLength(2000), notBlankValidator]],
      requesterName: ['', [Validators.required, Validators.maxLength(120), notBlankValidator]],
      requesterEmail: [
        '',
        [Validators.required, Validators.maxLength(150), Validators.pattern(EMAIL_PATTERN)],
      ],
      priority: this.fb.control<RequestPriority>('MEDIUM', Validators.required),
      status: this.fb.control<RequestStatus>('PENDING', Validators.required),
      technicianId: this.fb.control<number | null>(null),
      serviceTypeId: this.fb.control<number | null>(null, Validators.required),
    },
    { validators: technicianRequiredValidator },
  );

  constructor() {
    const request = this.data.request;
    if (request) {
      this.form.setValue({
        title: request.title,
        description: request.description,
        requesterName: request.requesterName,
        requesterEmail: request.requesterEmail,
        priority: request.priority,
        status: request.status,
        technicianId: request.technician?.id ?? null,
        serviceTypeId: request.serviceType.id,
      });
    }
  }

  protected get title(): string {
    return this.data.request ? `Editar solicitud #${this.data.request.id}` : 'Nueva solicitud';
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.serverError.set(null);
    this.data
      .save(this.toInput())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (saved) => this.dialogRef.close(saved),
        error: (error: AppError) => this.applyServerError(error),
      });
  }

  protected fieldError(name: string): string {
    const errors = this.form.get(name)?.errors;
    if (!errors) {
      return '';
    }
    if (errors['server']) {
      return errors['server'] as string;
    }
    if (errors['required'] || errors['blank']) {
      return 'Es obligatorio.';
    }
    if (errors['maxlength']) {
      return `Debe tener máximo ${(errors['maxlength'] as { requiredLength: number }).requiredLength} caracteres.`;
    }
    if (errors['pattern']) {
      return 'Debe ser un correo electrónico válido.';
    }
    return 'Valor no válido.';
  }

  private toInput(): ServiceRequestInput {
    const value = this.form.getRawValue();
    return {
      title: value.title.trim(),
      description: value.description.trim(),
      requesterName: value.requesterName.trim(),
      requesterEmail: value.requesterEmail.trim(),
      priority: value.priority,
      status: value.status,
      technicianId: value.technicianId,
      // Non-null: Validators.required guarantees it once the form is valid
      serviceTypeId: value.serviceTypeId!,
    };
  }

  private applyServerError(error: AppError): void {
    this.serverError.set(error.message);
    for (const detail of error.details) {
      const control = this.form.get(detail.field);
      control?.setErrors({ ...control.errors, server: detail.message });
      control?.markAsTouched();
    }
  }
}
