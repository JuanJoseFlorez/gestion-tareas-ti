import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type { ServiceRequestListQuery } from '../schemas/service-request.schemas.js';

// Contract shape: foreign keys replaced by embedded summaries
const withRelations = {
  omit: { technicianId: true, serviceTypeId: true },
  include: {
    technician: { select: { id: true, fullName: true, isActive: true } },
    serviceType: { select: { id: true, name: true, isActive: true } },
  },
} satisfies Prisma.ServiceRequestDefaultArgs;

export type ServiceRequestRecord = Prisma.ServiceRequestGetPayload<typeof withRelations>;

// Prisma's `contains` passes LIKE wildcards through; escape them so they match literally
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function buildWhere(query: ServiceRequestListQuery): Prisma.ServiceRequestWhereInput {
  const where: Prisma.ServiceRequestWhereInput = {
    status: query.status,
    priority: query.priority,
    serviceTypeId: query.serviceTypeId,
    technicianId: query.technicianId === 'unassigned' ? null : query.technicianId,
  };
  if (query.search) {
    const contains = { contains: escapeLike(query.search), mode: 'insensitive' } as const;
    where.OR = [{ title: contains }, { description: contains }, { requesterName: contains }];
  }
  return where;
}

export const serviceRequestRepository = {
  async list(query: ServiceRequestListQuery) {
    const where = buildWhere(query);
    const [data, total] = await prisma.$transaction([
      prisma.serviceRequest.findMany({
        ...withRelations,
        where,
        // Secondary sort by id keeps pagination stable when the primary value ties
        orderBy: [{ [query.sortBy]: query.order }, { id: query.order }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.serviceRequest.count({ where }),
    ]);
    return {
      data,
      meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    };
  },

  findById(id: number) {
    return prisma.serviceRequest.findUnique({ ...withRelations, where: { id } });
  },
};
