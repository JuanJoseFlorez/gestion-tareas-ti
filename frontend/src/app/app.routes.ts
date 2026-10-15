import { Routes } from '@angular/router';
import { NotFoundPage } from './shared/components/not-found/not-found-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'service-requests' },
  { path: '**', title: 'No encontrado | Gestión de Tareas TI', component: NotFoundPage },
];
