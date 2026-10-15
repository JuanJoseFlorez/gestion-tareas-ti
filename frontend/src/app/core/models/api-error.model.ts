export type ApiErrorCode =
  'VALIDATION_ERROR' | 'NOT_FOUND' | 'BUSINESS_RULE_VIOLATION' | 'INTERNAL_ERROR';

export interface ApiErrorDetail {
  field: string;
  message: string;
}

/** Error body sent by the backend. */
export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

/** Normalized error every HTTP observable fails with (see errorInterceptor). */
export interface AppError {
  status: number;
  code: ApiErrorCode | 'NETWORK_ERROR';
  message: string;
  details: ApiErrorDetail[];
}
