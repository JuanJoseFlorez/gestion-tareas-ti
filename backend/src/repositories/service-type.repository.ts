import { prisma } from '../lib/prisma.js';

export const serviceTypeRepository = {
  list(filter: { active?: boolean }) {
    return prisma.serviceType.findMany({
      where: { isActive: filter.active },
      select: { id: true, name: true, description: true, isActive: true },
      orderBy: { name: 'asc' },
    });
  },

  findById(id: number) {
    return prisma.serviceType.findUnique({ where: { id }, select: { id: true, isActive: true } });
  },
};
