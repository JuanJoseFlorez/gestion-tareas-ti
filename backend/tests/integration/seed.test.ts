import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { seed } from '../../src/seed.js';
import { createServiceRequest, resetDatabase } from '../helpers/db.js';

describe('seed', () => {
  beforeEach(resetDatabase);

  it('loads 5 technicians (1 inactive), 5 service types and 12 requests', async () => {
    await seed();
    expect(await prisma.technician.count()).toBe(5);
    expect(await prisma.technician.count({ where: { isActive: false } })).toBe(1);
    expect(await prisma.technician.findUnique({ where: { email: 'pedro.perez@empresa.com' } })).not.toBeNull();
    expect(await prisma.serviceType.count()).toBe(5);
    expect(await prisma.serviceRequest.count()).toBe(12);
  });

  it('covers every status, priority, unassigned requests and the inactive technician', async () => {
    await seed();
    const requests = await prisma.serviceRequest.findMany({ include: { technician: true } });
    expect(new Set(requests.map((r) => r.status))).toEqual(new Set(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']));
    expect(new Set(requests.map((r) => r.priority))).toEqual(new Set(['LOW', 'MEDIUM', 'HIGH']));
    expect(requests.some((r) => r.technicianId === null)).toBe(true);
    expect(requests.some((r) => r.technician?.isActive === false)).toBe(true);
  });

  it('is idempotent: running twice does not duplicate anything', async () => {
    await seed();
    await seed();
    expect(await prisma.technician.count()).toBe(5);
    expect(await prisma.serviceType.count()).toBe(5);
    expect(await prisma.serviceRequest.count()).toBe(12);
  });

  it('does not insert sample requests when requests already exist', async () => {
    await seed();
    await prisma.serviceRequest.deleteMany();
    const type = await prisma.serviceType.findFirstOrThrow();
    await createServiceRequest({ serviceTypeId: type.id });
    await seed();
    expect(await prisma.serviceRequest.count()).toBe(1);
  });
});
