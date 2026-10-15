import { Pipe, PipeTransform } from '@angular/core';
import { STATUS_LABELS } from '../../features/service-requests/models/service-request.labels';
import { RequestStatus } from '../../features/service-requests/models/service-request.models';

@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(status: RequestStatus): string {
    return STATUS_LABELS[status];
  }
}
