import { PriorityLabelPipe } from './priority-label.pipe';
import { StatusLabelPipe } from './status-label.pipe';

describe('label pipes', () => {
  it('translates statuses to Spanish', () => {
    const pipe = new StatusLabelPipe();
    expect(
      ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => pipe.transform(s as never)),
    ).toEqual(['Pendiente', 'En progreso', 'Completada', 'Cancelada']);
  });

  it('translates priorities to Spanish', () => {
    const pipe = new PriorityLabelPipe();
    expect(['LOW', 'MEDIUM', 'HIGH'].map((p) => pipe.transform(p as never))).toEqual([
      'Baja',
      'Media',
      'Alta',
    ]);
  });
});
