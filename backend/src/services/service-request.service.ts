import { BusinessRuleError, NotFoundError, type ErrorDetail } from '../errors/app-errors.js';
import { serviceRequestRepository, type ServiceRequestRecord } from '../repositories/service-request.repository.js';
import { serviceTypeRepository } from '../repositories/service-type.repository.js';
import { technicianRepository } from '../repositories/technician.repository.js';
import type {
  RequestStatus,
  ServiceRequestInput,
  ServiceRequestListQuery,
  ServiceRequestPatch,
} from '../schemas/service-request.schemas.js';

const STATUSES_REQUIRING_TECHNICIAN: readonly RequestStatus[] = ['IN_PROGRESS', 'COMPLETED'];

/** The fields the business rules look at, taken from the record as it will be after the write. */
interface Assignment {
  status: RequestStatus;
  technicianId: number | null;
  serviceTypeId: number;
}

function assertTechnicianForStatus({ status, technicianId }: Assignment): void {
  if (STATUSES_REQUIRING_TECHNICIAN.includes(status) && technicianId === null) {
    throw new BusinessRuleError(`Una solicitud en estado ${status} debe tener un técnico asignado.`, [
      { field: 'technicianId', message: 'Requerido cuando el estado es IN_PROGRESS o COMPLETED.' },
    ]);
  }
}

/**
 * Catalogs must exist and be active only when they are being assigned (on create, or when the id
 * changes). Keeping an already assigned, now inactive technician or service type is allowed.
 */
async function assertAssignableCatalogs(target: Assignment, current: ServiceRequestRecord | null): Promise<void> {
  const details: ErrorDetail[] = [];

  if (target.technicianId !== null && target.technicianId !== (current?.technician?.id ?? null)) {
    const technician = await technicianRepository.findById(target.technicianId);
    if (!technician) {
      details.push({ field: 'technicianId', message: 'El técnico no existe.' });
    } else if (!technician.isActive) {
      details.push({ field: 'technicianId', message: 'El técnico está inactivo y no puede recibir nuevas asignaciones.' });
    }
  }

  if (target.serviceTypeId !== current?.serviceType.id) {
    const serviceType = await serviceTypeRepository.findById(target.serviceTypeId);
    if (!serviceType) {
      details.push({ field: 'serviceTypeId', message: 'El tipo de servicio no existe.' });
    } else if (!serviceType.isActive) {
      details.push({ field: 'serviceTypeId', message: 'El tipo de servicio está inactivo.' });
    }
  }

  if (details.length > 0) {
    throw new BusinessRuleError('La solicitud no se puede asignar con los datos enviados.', details);
  }
}

function list(query: ServiceRequestListQuery) {
  return serviceRequestRepository.list(query);
}

async function getById(id: number): Promise<ServiceRequestRecord> {
  const record = await serviceRequestRepository.findById(id);
  if (!record) {
    throw new NotFoundError('La solicitud no existe.');
  }
  return record;
}

async function create(input: ServiceRequestInput): Promise<ServiceRequestRecord> {
  assertTechnicianForStatus(input);
  await assertAssignableCatalogs(input, null);
  return serviceRequestRepository.create(input);
}

/** Shared by PUT (full input) and PATCH (subset): rules run on current record + changes. */
async function update(id: number, changes: ServiceRequestPatch): Promise<ServiceRequestRecord> {
  const current = await getById(id);
  const resulting: Assignment = {
    status: changes.status ?? current.status,
    technicianId: changes.technicianId !== undefined ? changes.technicianId : (current.technician?.id ?? null),
    serviceTypeId: changes.serviceTypeId ?? current.serviceType.id,
  };
  assertTechnicianForStatus(resulting);
  await assertAssignableCatalogs(resulting, current);
  return serviceRequestRepository.update(id, changes);
}

async function remove(id: number): Promise<void> {
  await getById(id);
  await serviceRequestRepository.remove(id);
}

export const serviceRequestService = { list, getById, create, update, remove };
