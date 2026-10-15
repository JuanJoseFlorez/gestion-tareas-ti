import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LoadingService } from '../services/loading.service';
import { loadingInterceptor } from './loading.interceptor';

describe('loadingInterceptor', () => {
  it('is loading while at least one request is pending, including failed ones', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const loading = TestBed.inject(LoadingService);

    http.get('/a').subscribe();
    http.get('/b').subscribe({ error: () => undefined });
    expect(loading.isLoading()).toBe(true);

    controller.expectOne('/a').flush({});
    expect(loading.isLoading()).toBe(true);

    controller.expectOne('/b').flush('x', { status: 500, statusText: 'Server Error' });
    expect(loading.isLoading()).toBe(false);
  });
});
