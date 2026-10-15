import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessRuleError, NotFoundError } from '../../src/errors/app-errors.js';
import { serviceRequestRepository, type ServiceRequestRecord } from '../../src/repositories/service-request.repository.js';
import { serviceTypeRepository } from '../../src/repositories/service-type.repository.js';
import { technicianRepository } from '../../src/repositories/technician.repository.js';
import type { ServiceRequestInput } from '../../src/schemas/service-request.schemas.js';
import { serviceRequestService } from '../../src/services/service-request.service.js';

vi.mock('../../src/repositories/service-request.repository.js', () => ({
  serviceRequestRepository: { list: vi.fn(), findById: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('../../src/repositories/technician.repository.js', () => ({
  technicianRepository: { list: vi.fn(), findById: vi.fn() },
}));
vi.mock('../../src/repositories/service-type.repository.js', () => ({
  serviceTypeRepository: { list: vi.fn(), findById: vi.fn() },
}));

const repo = vi.mocked(serviceRequestRepository);
const technicians = vi.mocked(technicianRepository);
const serviceTypes = vi.mocked(serviceTypeRepository);

const ACTIVE_TECH = { id: 1, isActive: true };
const INACTIVE_TECH = { id: 2, isActive: false };
const ACTIVE_TYPE = { id: 10, isActive: true };
const INACTIVE_TYPE = { id: 11, isActive: false };

function input(overrides: Partial<ServiceRequestInput> = {}): ServiceRequestInput {
  return {
    title: 'Instalar Office',
    description: 'Equipo nuevo',
    requesterName: 'Carlos Ruiz',
    requesterEmail: 'carlos@empresa.com',
    priority: 'MEDIUM',
    status: 'PENDING',
    technicianId: null,
    serviceTypeId: ACTIVE_TYPE.id,
    ...overrides,
  };
}

function record(overrides: Partial<ServiceRequestRecord> = {}): ServiceRequestRecord {
  return {
    id: 42,
    title: 'Instalar Office',
    description: 'Equipo nuevo',
    requesterName: 'Carlos Ruiz',
    requesterEmail: 'carlos@empresa.com',
    priority: 'MEDIUM',
    status: 'PENDING',
    technician: null,
    serviceType: { id: ACTIVE_TYPE.id, name: 'Instalación de Software', isActive: true },
    createdAt: new Date('2026-10-14T10:00:00Z'),
    updatedAt: new Date('2026-10-14T10:00:00Z'),
    ...overrides,
  };
}

async function expectBusinessRule(promise: Promise<unknown>, field: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(BusinessRuleError);
  expect((error as BusinessRuleError).details?.map((d) => d.field)).toContain(field);
}

beforeEach(() => {
  vi.resetAllMocks();
  technicians.findById.mockImplementation(async (id) => [ACTIVE_TECH, INACTIVE_TECH].find((t) => t.id === id) ?? null);
  serviceTypes.findById.mockImplementation(async (id) => [ACTIVE_TYPE, INACTIVE_TYPE].find((s) => s.id === id) ?? null);
  repo.create.mockImplementation(async () => record());
  repo.update.mockImplementation(async () => record());
});

describe('create', () => {
  it('creates an unassigned PENDING request', async () => {
    await serviceRequestService.create(input());
    expect(repo.create).toHaveBeenCalledWith(input());
  });

  it.each(['IN_PROGRESS', 'COMPLETED'] as const)('rejects %s without a technician', async (status) => {
    await expectBusinessRule(serviceRequestService.create(input({ status })), 'technicianId');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'CANCELLED'] as const)('allows %s without a technician', async (status) => {
    await serviceRequestService.create(input({ status }));
    expect(repo.create).toHaveBeenCalled();
  });

  it('allows IN_PROGRESS with an active technician', async () => {
    await serviceRequestService.create(input({ status: 'IN_PROGRESS', technicianId: ACTIVE_TECH.id }));
    expect(repo.create).toHaveBeenCalled();
  });

  it('rejects inactive or missing catalogs', async () => {
    await expectBusinessRule(serviceRequestService.create(input({ technicianId: INACTIVE_TECH.id })), 'technicianId');
    await expectBusinessRule(serviceRequestService.create(input({ technicianId: 999 })), 'technicianId');
    await expectBusinessRule(serviceRequestService.create(input({ serviceTypeId: INACTIVE_TYPE.id })), 'serviceTypeId');
    await expectBusinessRule(serviceRequestService.create(input({ serviceTypeId: 999 })), 'serviceTypeId');
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('update', () => {
  it('throws NotFoundError when the request does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(serviceRequestService.update(42, { priority: 'HIGH' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('evaluates the status rule on the resulting record (PATCH with only status)', async () => {
    repo.findById.mockResolvedValue(record({ technician: null }));
    await expectBusinessRule(serviceRequestService.update(42, { status: 'IN_PROGRESS' }), 'technicianId');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejects removing the technician from an in-progress request', async () => {
    repo.findById.mockResolvedValue(
      record({ status: 'IN_PROGRESS', technician: { id: ACTIVE_TECH.id, fullName: 'Pedro Pérez', isActive: true } }),
    );
    await expectBusinessRule(serviceRequestService.update(42, { technicianId: null }), 'technicianId');
  });

  it('keeps an already assigned inactive technician (no reassignment)', async () => {
    repo.findById.mockResolvedValue(
      record({ status: 'COMPLETED', technician: { id: INACTIVE_TECH.id, fullName: 'Jorge Ramírez', isActive: false } }),
    );
    await serviceRequestService.update(42, input({ status: 'COMPLETED', technicianId: INACTIVE_TECH.id, priority: 'HIGH' }));
    expect(repo.update).toHaveBeenCalledWith(42, expect.objectContaining({ priority: 'HIGH' }));
  });

  it('keeps an already assigned inactive service type', async () => {
    repo.findById.mockResolvedValue(record({ serviceType: { id: INACTIVE_TYPE.id, name: 'Legacy', isActive: false } }));
    await serviceRequestService.update(42, { priority: 'LOW' });
    expect(repo.update).toHaveBeenCalled();
  });

  it('rejects reassigning to an inactive technician or service type', async () => {
    repo.findById.mockResolvedValue(record());
    await expectBusinessRule(serviceRequestService.update(42, { technicianId: INACTIVE_TECH.id }), 'technicianId');
    await expectBusinessRule(serviceRequestService.update(42, { serviceTypeId: INACTIVE_TYPE.id }), 'serviceTypeId');
  });

  it('allows free status transitions such as reopening a completed request', async () => {
    repo.findById.mockResolvedValue(
      record({ status: 'COMPLETED', technician: { id: ACTIVE_TECH.id, fullName: 'Pedro Pérez', isActive: true } }),
    );
    await serviceRequestService.update(42, { status: 'PENDING' });
    expect(repo.update).toHaveBeenCalledWith(42, { status: 'PENDING' });
  });
});

describe('remove', () => {
  it('deletes an existing request', async () => {
    repo.findById.mockResolvedValue(record());
    await serviceRequestService.remove(42);
    expect(repo.remove).toHaveBeenCalledWith(42);
  });

  it('throws NotFoundError for a missing request', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(serviceRequestService.remove(42)).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.remove).not.toHaveBeenCalled();
  });
});
