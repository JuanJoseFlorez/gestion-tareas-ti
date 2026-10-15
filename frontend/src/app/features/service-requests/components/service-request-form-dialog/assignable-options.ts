export interface CatalogOption {
  id: number;
  label: string;
  isActive: boolean;
}

export interface SelectOption {
  id: number;
  label: string;
}

/**
 * Options for a technician / service type select: active entries only, plus the entry the request
 * already has when it is not among them (inactive → marked "(inactivo)"), so editing never forces
 * a reassignment.
 */
export function buildAssignableOptions(
  catalog: readonly CatalogOption[],
  current: CatalogOption | null,
): SelectOption[] {
  const options = catalog.filter((item) => item.isActive).map(({ id, label }) => ({ id, label }));
  if (current && !options.some((option) => option.id === current.id)) {
    options.push({
      id: current.id,
      label: current.isActive ? current.label : `${current.label} (inactivo)`,
    });
  }
  return options;
}
