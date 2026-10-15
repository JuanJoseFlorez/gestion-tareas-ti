import { NotFoundError } from '../errors/app-errors.js';
import { serviceRequestRepository, type ServiceRequestRecord } from '../repositories/service-request.repository.js';
import type { ServiceRequestListQuery } from '../schemas/service-request.schemas.js';

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

export const serviceRequestService = { list, getById };
