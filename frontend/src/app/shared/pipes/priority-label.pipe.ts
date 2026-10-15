import { Pipe, PipeTransform } from '@angular/core';
import { PRIORITY_LABELS } from '../../features/service-requests/models/service-request.labels';
import { RequestPriority } from '../../features/service-requests/models/service-request.models';

@Pipe({ name: 'priorityLabel' })
export class PriorityLabelPipe implements PipeTransform {
  transform(priority: RequestPriority): string {
    return PRIORITY_LABELS[priority];
  }
}
