import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginatedResponse } from '../../../core/models/paginated-response.model';
import {
  ServiceRequest,
  ServiceRequestInput,
  ServiceRequestListQuery,
  ServiceRequestPatch,
} from '../models/service-request.models';

function toHttpParams(query: ServiceRequestListQuery): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/** HTTP only, stateless: one method per endpoint. */
@Injectable({ providedIn: 'root' })
export class ServiceRequestsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/service-requests`;

  list(query: ServiceRequestListQuery): Observable<PaginatedResponse<ServiceRequest>> {
    return this.http.get<PaginatedResponse<ServiceRequest>>(this.url, {
      params: toHttpParams(query),
    });
  }

  getById(id: number): Observable<ServiceRequest> {
    return this.http.get<ServiceRequest>(`${this.url}/${id}`);
  }

  create(input: ServiceRequestInput): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(this.url, input);
  }

  replace(id: number, input: ServiceRequestInput): Observable<ServiceRequest> {
    return this.http.put<ServiceRequest>(`${this.url}/${id}`, input);
  }

  patch(id: number, changes: ServiceRequestPatch): Observable<ServiceRequest> {
    return this.http.patch<ServiceRequest>(`${this.url}/${id}`, changes);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
