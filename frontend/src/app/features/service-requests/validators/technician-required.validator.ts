import { ValidatorFn } from '@angular/forms';
import { RequestStatus, STATUSES_REQUIRING_TECHNICIAN } from '../models/service-request.models';

/**
 * Group-level rule mirrored from the backend: IN_PROGRESS and COMPLETED need a technician.
 * Returns the error on the group; the form shows it on the technician select.
 */
export const technicianRequiredValidator: ValidatorFn = (group) => {
  const status = group.get('status')?.value as RequestStatus | null | undefined;
  const technicianId = group.get('technicianId')?.value as number | null | undefined;
  const required = !!status && STATUSES_REQUIRING_TECHNICIAN.includes(status);
  return required && (technicianId === null || technicianId === undefined)
    ? { technicianRequired: true }
    : null;
};
