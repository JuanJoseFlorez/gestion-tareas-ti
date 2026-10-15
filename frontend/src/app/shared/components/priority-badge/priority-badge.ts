import { Component, input } from '@angular/core';
import { RequestPriority } from '../../../features/service-requests/models/service-request.models';
import { PriorityLabelPipe } from '../../pipes/priority-label.pipe';

@Component({
  selector: 'app-priority-badge',
  imports: [PriorityLabelPipe],
  template: `<span [class]="'badge badge--' + priority().toLowerCase()">{{
    priority() | priorityLabel
  }}</span>`,
})
export class PriorityBadge {
  readonly priority = input.required<RequestPriority>();
}
