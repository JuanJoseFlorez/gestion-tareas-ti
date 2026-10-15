import { Component, input } from '@angular/core';
import { RequestStatus } from '../../../features/service-requests/models/service-request.models';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';

@Component({
  selector: 'app-status-badge',
  imports: [StatusLabelPipe],
  template: `<span [class]="'badge badge--' + status().toLowerCase()">{{
    status() | statusLabel
  }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<RequestStatus>();
}
