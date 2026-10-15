import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

describe('ConfirmDialog', () => {
  it('shows the data and closes with true on confirm and false on cancel', async () => {
    const close = vi.fn();
    const data: ConfirmDialogData = {
      title: 'Eliminar solicitud',
      message: '¿Eliminar #4?',
      confirmText: 'Eliminar',
    };
    TestBed.configureTestingModule({
      imports: [ConfirmDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(ConfirmDialog);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Eliminar solicitud');
    expect(element.textContent).toContain('¿Eliminar #4?');

    const [cancel, confirm] = Array.from(element.querySelectorAll('button'));
    confirm.click();
    expect(close).toHaveBeenLastCalledWith(true);
    cancel.click();
    expect(close).toHaveBeenLastCalledWith(false);
  });
});
