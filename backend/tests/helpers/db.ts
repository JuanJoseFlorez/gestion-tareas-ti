import { prisma } from '../../src/lib/prisma.js';
import type { Prisma } from '../../src/generated/prisma/client.js';

/** Empties every table. Guarded so it can never run against a non-test database. */
export async function resetDatabase(): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetDatabase() must only run with NODE_ENV=test');
  }
  await prisma.$executeRaw`TRUNCATE service_request, technician, service_type RESTART IDENTITY CASCADE`;
}

/** Two active + one inactive technician, two active + one inactive service type. */
export async function createCatalogFixtures() {
  const pedro = await prisma.technician.create({ data: { fullName: 'Pedro Pérez', email: 'pedro@test.com' } });
  const laura = await prisma.technician.create({ data: { fullName: 'Laura Gómez', email: 'laura@test.com' } });
  const jorge = await prisma.technician.create({
    data: { fullName: 'Jorge Ramírez', email: 'jorge@test.com', isActive: false },
  });
  const printer = await prisma.serviceType.create({ data: { name: 'Mantenimiento Impresora' } });
  const software = await prisma.serviceType.create({ data: { name: 'Instalación de Software' } });
  const legacy = await prisma.serviceType.create({ data: { name: 'Soporte Legacy', isActive: false } });
  return { pedro, laura, jorge, printer, software, legacy };
}

type ServiceRequestFixture = Partial<Prisma.ServiceRequestUncheckedCreateInput> & { serviceTypeId: number };

export function createServiceRequest(data: ServiceRequestFixture) {
  return prisma.serviceRequest.create({
    data: {
      title: 'Solicitud de prueba',
      description: 'Descripción de prueba',
      requesterName: 'Ana Gómez',
      requesterEmail: 'ana@test.com',
      ...data,
    },
  });
}
