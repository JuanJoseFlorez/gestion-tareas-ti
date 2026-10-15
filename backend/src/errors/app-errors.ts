export type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'BUSINESS_RULE_VIOLATION' | 'INTERNAL_ERROR';

export interface ErrorDetail {
  field: string;
  message: string;
}

/** Base for errors whose message is safe to send to the client verbatim. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, 'NOT_FOUND', message);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(422, 'BUSINESS_RULE_VIOLATION', message, details);
  }
}
