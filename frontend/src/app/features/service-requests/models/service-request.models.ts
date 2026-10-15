// Mirrors the spec "Contrato de Tipos" exactly. Any difference is a bug.
export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ServiceRequest {
  id: number;
  title: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  priority: RequestPriority;
  status: RequestStatus;
  technician: { id: number; fullName: string; isActive: boolean } | null;
  serviceType: { id: number; name: string; isActive: boolean };
  createdAt: string;
  updatedAt: string;
}

/** Body of POST and PUT. technicianId null = unassigned. */
export interface ServiceRequestInput {
  title: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  priority: RequestPriority;
  status: RequestStatus;
  technicianId: number | null;
  serviceTypeId: number;
}

export type ServiceRequestPatch = Partial<ServiceRequestInput>;

export type ServiceRequestSortField = 'createdAt' | 'updatedAt' | 'priority' | 'status';
export type SortOrder = 'asc' | 'desc';

export interface ServiceRequestListQuery {
  search?: string;
  status?: RequestStatus;
  priority?: RequestPriority;
  technicianId?: number | 'unassigned';
  serviceTypeId?: number;
  sortBy?: ServiceRequestSortField;
  order?: SortOrder;
  page?: number;
  pageSize?: number;
}

export interface ServiceRequestSort {
  sortBy: ServiceRequestSortField;
  order: SortOrder;
}

/** Values edited by the filters bar; null = no filter. */
export interface ServiceRequestFilterValues {
  search: string;
  status: RequestStatus | null;
  priority: RequestPriority | null;
  technicianId: number | 'unassigned' | null;
  serviceTypeId: number | null;
}

export const EMPTY_FILTERS: ServiceRequestFilterValues = {
  search: '',
  status: null,
  priority: null,
  technicianId: null,
  serviceTypeId: null,
};

/** Business rule shared with the backend: these statuses need an assigned technician. */
export const STATUSES_REQUIRING_TECHNICIAN: readonly RequestStatus[] = ['IN_PROGRESS', 'COMPLETED'];
