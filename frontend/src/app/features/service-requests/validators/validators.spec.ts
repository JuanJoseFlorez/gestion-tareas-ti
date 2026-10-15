import { FormControl, FormGroup } from '@angular/forms';
import { RequestStatus } from '../models/service-request.models';
import { notBlankValidator } from './not-blank.validator';
import { technicianRequiredValidator } from './technician-required.validator';

describe('notBlankValidator', () => {
  it('flags whitespace-only strings and accepts empty or real text', () => {
    expect(notBlankValidator(new FormControl('   '))).toEqual({ blank: true });
    expect(notBlankValidator(new FormControl(''))).toBeNull(); // "required" reports empty values
    expect(notBlankValidator(new FormControl(' a '))).toBeNull();
  });
});

describe('technicianRequiredValidator', () => {
  const cases: [RequestStatus, number | null, boolean][] = [
    ['PENDING', null, false],
    ['PENDING', 1, false],
    ['IN_PROGRESS', null, true],
    ['IN_PROGRESS', 1, false],
    ['COMPLETED', null, true],
    ['COMPLETED', 1, false],
    ['CANCELLED', null, false],
    ['CANCELLED', 1, false],
  ];

  it.each(cases)('status %s with technician %s → error: %s', (status, technicianId, hasError) => {
    const group = new FormGroup({
      status: new FormControl(status),
      technicianId: new FormControl(technicianId),
    });
    expect(technicianRequiredValidator(group)).toEqual(
      hasError ? { technicianRequired: true } : null,
    );
  });
});
