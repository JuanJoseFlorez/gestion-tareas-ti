import { TestBed } from '@angular/core/testing';
import { EMPTY_FILTERS, ServiceRequestFilterValues } from '../../models/service-request.models';
import { ServiceRequestFilters } from './service-request-filters';

describe('ServiceRequestFilters', () => {
  afterEach(() => vi.useRealTimers());

  it('emits 300 ms after the last change and only when values changed', async () => {
    TestBed.configureTestingModule({ imports: [ServiceRequestFilters] });
    const fixture = TestBed.createComponent(ServiceRequestFilters);
    fixture.componentRef.setInput('filters', EMPTY_FILTERS);
    fixture.componentRef.setInput('technicians', []);
    fixture.componentRef.setInput('serviceTypes', []);
    await fixture.whenStable();

    vi.useFakeTimers();
    const emitted: ServiceRequestFilterValues[] = [];
    fixture.componentInstance.filtersChange.subscribe((v) => emitted.push(v));
    const form = fixture.componentInstance['form'];

    form.controls.search.setValue('imp');
    form.controls.search.setValue('impresora');
    vi.advanceTimersByTime(299);
    expect(emitted).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(emitted).toEqual([{ ...EMPTY_FILTERS, search: 'impresora' }]);

    form.controls.technicianId.setValue('unassigned');
    vi.advanceTimersByTime(300);
    expect(emitted.at(-1)).toEqual({
      ...EMPTY_FILTERS,
      search: 'impresora',
      technicianId: 'unassigned',
    });

    // Same values again → no extra emission
    form.controls.technicianId.setValue('unassigned');
    vi.advanceTimersByTime(300);
    expect(emitted).toHaveLength(2);
  });

  it('starts from the given filters without emitting', async () => {
    TestBed.configureTestingModule({ imports: [ServiceRequestFilters] });
    const fixture = TestBed.createComponent(ServiceRequestFilters);
    const initial = { ...EMPTY_FILTERS, status: 'PENDING' as const };
    fixture.componentRef.setInput('filters', initial);
    fixture.componentRef.setInput('technicians', []);
    fixture.componentRef.setInput('serviceTypes', []);
    const emitted: ServiceRequestFilterValues[] = [];
    fixture.componentInstance.filtersChange.subscribe((v) => emitted.push(v));
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(fixture.componentInstance['form'].getRawValue()).toEqual(initial);
    expect(emitted).toEqual([]);
  });
});
