import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { LoadingService } from './core/services/loading.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the title in the toolbar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'Gestión de Tareas TI',
    );
  });

  it('shows the progress bar only while requests are pending', async () => {
    const fixture = TestBed.createComponent(App);
    const loading = TestBed.inject(LoadingService);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('mat-progress-bar')).toBeNull();
    loading.start();
    await fixture.whenStable();
    expect(element.querySelector('mat-progress-bar')).not.toBeNull();
  });
});
