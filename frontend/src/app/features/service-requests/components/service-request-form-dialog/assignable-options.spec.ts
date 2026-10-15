import { buildAssignableOptions } from './assignable-options';

const catalog = [
  { id: 1, label: 'Pedro Pérez', isActive: true },
  { id: 2, label: 'Jorge Ramírez', isActive: false },
  { id: 3, label: 'Laura Gómez', isActive: true },
];

describe('buildAssignableOptions', () => {
  it('offers only active entries when nothing is assigned (create mode)', () => {
    expect(buildAssignableOptions(catalog, null)).toEqual([
      { id: 1, label: 'Pedro Pérez' },
      { id: 3, label: 'Laura Gómez' },
    ]);
  });

  it('adds the current inactive entry marked "(inactivo)" (edit mode)', () => {
    expect(
      buildAssignableOptions(catalog, { id: 2, label: 'Jorge Ramírez', isActive: false }),
    ).toEqual([
      { id: 1, label: 'Pedro Pérez' },
      { id: 3, label: 'Laura Gómez' },
      { id: 2, label: 'Jorge Ramírez (inactivo)' },
    ]);
  });

  it('does not duplicate a current active entry', () => {
    expect(
      buildAssignableOptions(catalog, { id: 1, label: 'Pedro Pérez', isActive: true }),
    ).toHaveLength(2);
  });

  it('keeps the current entry even if the catalog failed to load', () => {
    expect(buildAssignableOptions([], { id: 1, label: 'Pedro Pérez', isActive: true })).toEqual([
      { id: 1, label: 'Pedro Pérez' },
    ]);
  });
});
