import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeEs from '@angular/common/locales/es';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { SpanishPaginatorIntl } from './core/i18n/spanish-paginator-intl';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

// Spanish dates and numbers for the DatePipe
registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // loading first so the progress bar also covers requests that end in error
    provideHttpClient(withInterceptors([loadingInterceptor, errorInterceptor])),
    { provide: LOCALE_ID, useValue: 'es' },
    { provide: MatPaginatorIntl, useClass: SpanishPaginatorIntl },
  ],
};
