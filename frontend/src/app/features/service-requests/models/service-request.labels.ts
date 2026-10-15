import { RequestPriority, RequestStatus } from './service-request.models';

export const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

export const REQUEST_STATUSES = Object.keys(STATUS_LABELS) as RequestStatus[];
export const REQUEST_PRIORITIES = Object.keys(PRIORITY_LABELS) as RequestPriority[];
