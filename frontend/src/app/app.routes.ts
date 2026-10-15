import { Routes } from '@angular/router';
import { NotFoundPage } from './shared/components/not-found/not-found-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'service-requests' },
  {
    path: 'service-requests',
    title: 'Solicitudes | Gestión de Tareas TI',
    // Dynamic import is required for lazy loading (the only allowed non-top-level import)
    loadComponent: () =>
      import('./features/service-requests/pages/service-request-list/service-request-list').then(
        (m) => m.ServiceRequestListPage,
      ),
  },
  { path: '**', title: 'No encontrado | Gestión de Tareas TI', component: NotFoundPage },
];
