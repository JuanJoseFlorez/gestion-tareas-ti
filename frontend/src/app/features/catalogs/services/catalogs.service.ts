import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ServiceType, Technician } from '../models/catalog.models';

/**
 * Read-only catalogs, requested once per session (shareReplay). All entries are loaded, active and
 * inactive: filters need inactive technicians, the form derives the active subset.
 * shareReplay resets on error, so a failed load is retried on the next subscription.
 */
@Injectable({ providedIn: 'root' })
export class CatalogsService {
  private readonly http = inject(HttpClient);

  readonly technicians$ = this.http
    .get<Technician[]>(`${environment.apiUrl}/technicians`)
    .pipe(shareReplay(1));

  readonly serviceTypes$ = this.http
    .get<ServiceType[]>(`${environment.apiUrl}/service-types`)
    .pipe(shareReplay(1));
}
