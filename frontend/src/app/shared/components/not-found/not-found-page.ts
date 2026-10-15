import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [MatButtonModule, RouterLink],
  template: `
    <section class="not-found">
      <h2>Página no encontrada</h2>
      <p>La dirección que buscas no existe.</p>
      <a mat-flat-button routerLink="/service-requests">Ir a solicitudes</a>
    </section>
  `,
  styles: `
    .not-found {
      text-align: center;
      padding: 64px 16px;
    }
  `,
})
export class NotFoundPage {}
