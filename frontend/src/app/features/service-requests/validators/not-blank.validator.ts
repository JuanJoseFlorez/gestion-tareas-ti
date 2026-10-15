import { ValidatorFn } from '@angular/forms';

/** Rejects whitespace-only text (Validators.required lets "   " through). */
export const notBlankValidator: ValidatorFn = (control) => {
  const value: unknown = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0
    ? { blank: true }
    : null;
};
