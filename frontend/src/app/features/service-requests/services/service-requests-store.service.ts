import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, map, of, switchMap, tap } from 'rxjs';
import { AppError } from '../../../core/models/api-error.model';
import { PaginatedResponse, PaginationMeta } from '../../../core/models/paginated-response.model';
import {
  EMPTY_FILTERS,
  RequestStatus,
  ServiceRequest,
  ServiceRequestFilterValues,
  ServiceRequestInput,
  ServiceRequestListQuery,
  ServiceRequestSort,
} from '../models/service-request.models';
import { ServiceRequestsApiService } from './service-requests-api.service';

type ListResult = { response: PaginatedResponse<ServiceRequest> } | { error: AppError };

/** List state (signals) + mutations that keep it fresh. */
@Injectable({ providedIn: 'root' })
export class ServiceRequestsStore {
  private readonly api = inject(ServiceRequestsApiService);
  private readonly reload$ = new Subject<void>();

  readonly requests = signal<ServiceRequest[]>([]);
  readonly meta = signal<PaginationMeta>({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  readonly filters = signal<ServiceRequestFilterValues>(EMPTY_FILTERS);
  readonly sort = signal<ServiceRequestSort>({ sortBy: 'createdAt', order: 'desc' });
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly isEmpty = computed(() => !this.loading() && this.requests().length === 0);

  constructor() {
    // switchMap drops responses of superseded loads (fast filter changes never show stale data)
    this.reload$
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(() =>
          this.api.list(this.buildQuery()).pipe(
            map((response): ListResult => ({ response })),
            catchError((error: AppError) => of<ListResult>({ error })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => this.applyResult(result));
  }

  load(): void {
    this.reload$.next();
  }

  setFilters(filters: ServiceRequestFilterValues): void {
    this.filters.set(filters);
    this.meta.update((meta) => ({ ...meta, page: 1 }));
    this.load();
  }

  setPage(page: number, pageSize: number): void {
    this.meta.update((meta) => ({ ...meta, page, pageSize }));
    this.load();
  }

  setSort(sort: ServiceRequestSort): void {
    this.sort.set(sort);
    this.meta.update((meta) => ({ ...meta, page: 1 }));
    this.load();
  }

  create(input: ServiceRequestInput): Observable<ServiceRequest> {
    return this.api.create(input).pipe(tap(() => this.load()));
  }

  update(id: number, input: ServiceRequestInput): Observable<ServiceRequest> {
    return this.api.replace(id, input).pipe(tap(() => this.load()));
  }

  changeStatus(id: number, status: RequestStatus): Observable<ServiceRequest> {
    return this.api.patch(id, { status }).pipe(tap(() => this.load()));
  }

  remove(id: number): Observable<void> {
    return this.api.remove(id).pipe(tap(() => this.load()));
  }

  private applyResult(result: ListResult): void {
    if ('error' in result) {
      this.error.set(result.error);
      this.loading.set(false);
      return;
    }
    const { data, meta } = result.response;
    // e.g. the last row of the last page was deleted: jump to the last page that still exists
    if (data.length === 0 && meta.page > 1) {
      this.meta.set({ ...meta, page: Math.max(1, meta.totalPages) });
      this.load();
      return;
    }
    this.requests.set(data);
    // pageSize is the user's choice; keep it even if a response echoes something else
    this.meta.set({ ...meta, pageSize: this.meta().pageSize });
    this.error.set(null);
    this.loading.set(false);
  }

  private buildQuery(): ServiceRequestListQuery {
    const filters = this.filters();
    const { page, pageSize } = this.meta();
    const { sortBy, order } = this.sort();
    return {
      search: filters.search.trim() || undefined,
      status: filters.status ?? undefined,
      priority: filters.priority ?? undefined,
      technicianId: filters.technicianId ?? undefined,
      serviceTypeId: filters.serviceTypeId ?? undefined,
      sortBy,
      order,
      page,
      pageSize,
    };
  }
}
