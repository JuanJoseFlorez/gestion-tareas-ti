import { Component, OnInit, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { ServiceType, Technician } from '../../../catalogs/models/catalog.models';
import {
  PRIORITY_LABELS,
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
  STATUS_LABELS,
} from '../../models/service-request.labels';
import {
  EMPTY_FILTERS,
  RequestPriority,
  RequestStatus,
  ServiceRequestFilterValues,
} from '../../models/service-request.models';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-service-request-filters',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './service-request-filters.html',
  styleUrl: './service-request-filters.scss',
})
export class ServiceRequestFilters implements OnInit {
  readonly filters = input.required<ServiceRequestFilterValues>();
  readonly technicians = input.required<Technician[]>();
  readonly serviceTypes = input.required<ServiceType[]>();
  readonly filtersChange = output<ServiceRequestFilterValues>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly statuses = REQUEST_STATUSES;
  protected readonly priorities = REQUEST_PRIORITIES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;

  protected readonly form = this.fb.group({
    search: '',
    status: this.fb.control<RequestStatus | null>(null),
    priority: this.fb.control<RequestPriority | null>(null),
    technicianId: this.fb.control<number | 'unassigned' | null>(null),
    serviceTypeId: this.fb.control<number | null>(null),
  });

  constructor() {
    // One debounce for every field keeps it simple; 300 ms is imperceptible on selects
    this.form.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map(() => this.form.getRawValue()),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(),
      )
      .subscribe((values) => this.filtersChange.emit(values));
  }

  ngOnInit(): void {
    // Inputs are available from here on; the store's filters seed the form without emitting
    this.form.setValue(this.filters(), { emitEvent: false });
  }

  protected clear(): void {
    this.form.setValue(EMPTY_FILTERS);
  }
}
