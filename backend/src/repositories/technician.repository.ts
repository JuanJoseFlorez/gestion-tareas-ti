import { prisma } from '../lib/prisma.js';

export const technicianRepository = {
  list(filter: { active?: boolean }) {
    return prisma.technician.findMany({
      where: { isActive: filter.active },
      select: { id: true, fullName: true, email: true, isActive: true },
      orderBy: { fullName: 'asc' },
    });
  },

  findById(id: number) {
    return prisma.technician.findUnique({ where: { id }, select: { id: true, isActive: true } });
  },
};
