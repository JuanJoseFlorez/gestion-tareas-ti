import { Component, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Observable, catchError, filter, forkJoin, switchMap, throwError } from 'rxjs';
import { AppError } from '../../../../core/models/api-error.model';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ServiceType, Technician } from '../../../catalogs/models/catalog.models';
import { CatalogsService } from '../../../catalogs/services/catalogs.service';
import {
  ServiceRequestFormDialog,
  ServiceRequestFormDialogData,
} from '../../components/service-request-form-dialog/service-request-form-dialog';
import { ServiceRequestFilters } from '../../components/service-request-filters/service-request-filters';
import {
  ServiceRequestTable,
  StatusChangeEvent,
} from '../../components/service-request-table/service-request-table';
import { ServiceRequest, ServiceRequestInput } from '../../models/service-request.models';
import { ServiceRequestsStore } from '../../services/service-requests-store.service';

/** Container: the only component that knows the store, catalogs and dialogs. */
@Component({
  selector: 'app-service-request-list-page',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    ServiceRequestFilters,
    ServiceRequestTable,
  ],
  templateUrl: './service-request-list.html',
  styleUrl: './service-request-list.scss',
})
export class ServiceRequestListPage {
  protected readonly store = inject(ServiceRequestsStore);
  private readonly catalogs = inject(CatalogsService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  protected readonly technicians = signal<Technician[]>([]);
  protected readonly serviceTypes = signal<ServiceType[]>([]);

  constructor() {
    this.store.load();
    this.loadCatalogs();
    effect(() => {
      const error = this.store.error();
      if (error) {
        this.notifications.error(error.message);
      }
    });
  }

  protected retry(): void {
    this.store.load();
    if (this.serviceTypes().length === 0) {
      this.loadCatalogs();
    }
  }

  protected openCreate(): void {
    this.openForm(
      null,
      (input) => this.store.create(input),
      (saved) => `Solicitud #${saved.id} creada.`,
    );
  }

  protected openEdit(request: ServiceRequest): void {
    this.openForm(
      request,
      (input) => this.store.update(request.id, input),
      (saved) => `Solicitud #${saved.id} actualizada.`,
    );
  }

  protected confirmDelete(request: ServiceRequest): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Eliminar solicitud',
          message: `¿Eliminar la solicitud #${request.id} "${request.title}"? Esta acción no se puede deshacer.`,
          confirmText: 'Eliminar',
        },
      })
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.store.remove(request.id)),
      )
      .subscribe({
        next: () => this.notifications.success(`Solicitud #${request.id} eliminada.`),
        error: (error: AppError) => this.handleMutationError(error),
      });
  }

  protected changeStatus({ request, status }: StatusChangeEvent): void {
    this.store.changeStatus(request.id, status).subscribe({
      next: () => this.notifications.success(`Estado de la solicitud #${request.id} actualizado.`),
      error: (error: AppError) => this.handleMutationError(error),
    });
  }

  protected onPage(event: PageEvent): void {
    this.store.setPage(event.pageIndex + 1, event.pageSize);
  }

  private openForm(
    request: ServiceRequest | null,
    save: (input: ServiceRequestInput) => Observable<ServiceRequest>,
    successMessage: (saved: ServiceRequest) => string,
  ): void {
    // The request may have been deleted by someone else: close the dialog, notify and reload.
    const guardedSave = (input: ServiceRequestInput): Observable<ServiceRequest> =>
      save(input).pipe(
        catchError((error: AppError) => {
          if (error.code === 'NOT_FOUND') {
            this.handleMutationError(error);
            ref.close();
          }
          return throwError(() => error);
        }),
      );
    const ref = this.dialog.open<
      ServiceRequestFormDialog,
      ServiceRequestFormDialogData,
      ServiceRequest
    >(ServiceRequestFormDialog, {
      data: {
        request,
        technicians: this.technicians(),
        serviceTypes: this.serviceTypes(),
        save: guardedSave,
      },
      width: '720px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.notifications.success(successMessage(saved));
      }
    });
  }

  private handleMutationError(error: AppError): void {
    if (error.code === 'NOT_FOUND') {
      this.notifications.error('La solicitud ya no existe.');
      this.store.load();
      return;
    }
    this.notifications.error(error.message);
  }

  private loadCatalogs(): void {
    forkJoin({
      technicians: this.catalogs.technicians$,
      serviceTypes: this.catalogs.serviceTypes$,
    }).subscribe({
      next: ({ technicians, serviceTypes }) => {
        this.technicians.set(technicians);
        this.serviceTypes.set(serviceTypes);
      },
      error: () =>
        this.notifications.error(
          'No se pudieron cargar los catálogos. Usa "Reintentar" o recarga la página.',
        ),
    });
  }
}
