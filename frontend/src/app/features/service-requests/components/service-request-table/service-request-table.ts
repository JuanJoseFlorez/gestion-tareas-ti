import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PriorityBadge } from '../../../../shared/components/priority-badge/priority-badge';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { StatusLabelPipe } from '../../../../shared/pipes/status-label.pipe';
import { REQUEST_STATUSES } from '../../models/service-request.labels';
import {
  RequestStatus,
  ServiceRequest,
  ServiceRequestSort,
  ServiceRequestSortField,
  SortOrder,
} from '../../models/service-request.models';

export interface StatusChangeEvent {
  request: ServiceRequest;
  status: RequestStatus;
}

@Component({
  selector: 'app-service-request-table',
  imports: [
    DatePipe,
    MatTableModule,
    MatSortModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    StatusBadge,
    PriorityBadge,
    StatusLabelPipe,
  ],
  templateUrl: './service-request-table.html',
  styleUrl: './service-request-table.scss',
})
export class ServiceRequestTable {
  readonly requests = input.required<ServiceRequest[]>();
  readonly sort = input.required<ServiceRequestSort>();

  readonly edit = output<ServiceRequest>();
  readonly remove = output<ServiceRequest>();
  readonly statusChange = output<StatusChangeEvent>();
  readonly sortChange = output<ServiceRequestSort>();

  protected readonly columns = [
    'id',
    'title',
    'serviceType',
    'technician',
    'priority',
    'status',
    'createdAt',
    'actions',
  ];
  protected readonly statuses = REQUEST_STATUSES;

  protected onSortChange(event: Sort): void {
    this.sortChange.emit({
      sortBy: event.active as ServiceRequestSortField,
      order: (event.direction || 'asc') as SortOrder,
    });
  }
}
