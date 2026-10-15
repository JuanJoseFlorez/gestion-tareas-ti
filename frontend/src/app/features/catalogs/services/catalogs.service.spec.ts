import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { CatalogsService } from './catalogs.service';

describe('CatalogsService', () => {
  it('requests each catalog once and shares the result between subscribers', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const catalogs = TestBed.inject(CatalogsService);
    const controller = TestBed.inject(HttpTestingController);

    const first: unknown[] = [];
    const second: unknown[] = [];
    catalogs.technicians$.subscribe((t) => first.push(t));
    catalogs.technicians$.subscribe((t) => second.push(t));
    const technicians = [{ id: 1, fullName: 'Pedro Pérez', email: 'p@e.com', isActive: true }];
    controller.expectOne(`${environment.apiUrl}/technicians`).flush(technicians);
    expect(first).toEqual([technicians]);
    expect(second).toEqual([technicians]);

    catalogs.serviceTypes$.subscribe();
    controller.expectOne(`${environment.apiUrl}/service-types`).flush([]);
    controller.verify();
  });
});
