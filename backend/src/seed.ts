import { pathToFileURL } from 'node:url';
import { prisma } from './lib/prisma.js';

const technicians = [
  { fullName: 'Pedro Pérez', email: 'pedro.perez@empresa.com', isActive: true },
  { fullName: 'Laura Gómez', email: 'laura.gomez@empresa.com', isActive: true },
  { fullName: 'Andrés Restrepo', email: 'andres.restrepo@empresa.com', isActive: true },
  { fullName: 'Camila Torres', email: 'camila.torres@empresa.com', isActive: true },
  // Inactive on purpose: shows that historical assignments survive deactivation
  { fullName: 'Jorge Ramírez', email: 'jorge.ramirez@empresa.com', isActive: false },
];

const serviceTypes = [
  { name: 'Mantenimiento Impresora', description: 'Atascos, calidad de impresión y mantenimiento preventivo.' },
  { name: 'Instalación de Software', description: 'Instalación y licenciamiento de aplicaciones.' },
  { name: 'Soporte de Red', description: 'Conectividad, Wi-Fi y acceso a recursos compartidos.' },
  { name: 'Configuración de Equipo', description: 'Preparación de equipos nuevos y periféricos.' },
  { name: 'Restablecimiento de Contraseña', description: 'Desbloqueo y cambio de credenciales.' },
];

type SampleRequest = {
  title: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  technicianEmail: string | null;
  serviceTypeName: string;
};

// Every IN_PROGRESS / COMPLETED request has a technician (status ↔ technician rule)
const sampleRequests: SampleRequest[] = [
  { title: 'Impresora del piso 3 no imprime', description: 'La impresora HP del piso 3 muestra error de atasco de papel.', requesterName: 'Ana Gómez', requesterEmail: 'ana.gomez@empresa.com', priority: 'HIGH', status: 'PENDING', technicianEmail: null, serviceTypeName: 'Mantenimiento Impresora' },
  { title: 'Instalar Office en equipo nuevo', description: 'Equipo nuevo del área contable requiere Microsoft Office.', requesterName: 'Carlos Ruiz', requesterEmail: 'carlos.ruiz@empresa.com', priority: 'MEDIUM', status: 'IN_PROGRESS', technicianEmail: 'pedro.perez@empresa.com', serviceTypeName: 'Instalación de Software' },
  { title: 'Sin conexión Wi-Fi en sala de juntas', description: 'Los portátiles no detectan la red corporativa en la sala B.', requesterName: 'María López', requesterEmail: 'maria.lopez@empresa.com', priority: 'HIGH', status: 'IN_PROGRESS', technicianEmail: 'laura.gomez@empresa.com', serviceTypeName: 'Soporte de Red' },
  { title: 'Configurar portátil para nuevo ingreso', description: 'Preparar equipo con VPN, correo y accesos para el nuevo analista.', requesterName: 'Recursos Humanos', requesterEmail: 'rrhh@empresa.com', priority: 'MEDIUM', status: 'COMPLETED', technicianEmail: 'andres.restrepo@empresa.com', serviceTypeName: 'Configuración de Equipo' },
  { title: 'Restablecer contraseña de ERP', description: 'Usuario bloqueado tras varios intentos fallidos.', requesterName: 'Julián Mesa', requesterEmail: 'julian.mesa@empresa.com', priority: 'LOW', status: 'COMPLETED', technicianEmail: 'camila.torres@empresa.com', serviceTypeName: 'Restablecimiento de Contraseña' },
  { title: 'Mantenimiento preventivo de plotter', description: 'Revisión trimestral del plotter de ingeniería.', requesterName: 'Diana Castro', requesterEmail: 'diana.castro@empresa.com', priority: 'LOW', status: 'COMPLETED', technicianEmail: 'jorge.ramirez@empresa.com', serviceTypeName: 'Mantenimiento Impresora' },
  { title: 'Instalar AutoCAD', description: 'Licencia aprobada para el área de diseño.', requesterName: 'Felipe Ríos', requesterEmail: 'felipe.rios@empresa.com', priority: 'MEDIUM', status: 'PENDING', technicianEmail: 'pedro.perez@empresa.com', serviceTypeName: 'Instalación de Software' },
  { title: 'Cable de red dañado en puesto 12', description: 'El puesto 12 pierde conexión de forma intermitente.', requesterName: 'Sofía Herrera', requesterEmail: 'sofia.herrera@empresa.com', priority: 'MEDIUM', status: 'PENDING', technicianEmail: null, serviceTypeName: 'Soporte de Red' },
  { title: 'Monitor adicional para diseño', description: 'Conectar y calibrar segundo monitor.', requesterName: 'Felipe Ríos', requesterEmail: 'felipe.rios@empresa.com', priority: 'LOW', status: 'CANCELLED', technicianEmail: null, serviceTypeName: 'Configuración de Equipo' },
  { title: 'Cambio de contraseña de correo', description: 'Solicitud de cambio por política de seguridad.', requesterName: 'Ana Gómez', requesterEmail: 'ana.gomez@empresa.com', priority: 'LOW', status: 'PENDING', technicianEmail: null, serviceTypeName: 'Restablecimiento de Contraseña' },
  { title: 'Actualizar antivirus en recepción', description: 'El equipo de recepción reporta licencia vencida.', requesterName: 'Recepción', requesterEmail: 'recepcion@empresa.com', priority: 'HIGH', status: 'IN_PROGRESS', technicianEmail: 'camila.torres@empresa.com', serviceTypeName: 'Instalación de Software' },
  { title: 'Impresora a color sin tóner', description: 'Se requiere reemplazo de cartuchos de color.', requesterName: 'Mercadeo', requesterEmail: 'mercadeo@empresa.com', priority: 'MEDIUM', status: 'CANCELLED', technicianEmail: 'laura.gomez@empresa.com', serviceTypeName: 'Mantenimiento Impresora' },
];

/** Idempotent: catalogs are upserted; sample requests are only inserted into an empty table. */
export async function seed(): Promise<void> {
  for (const technician of technicians) {
    await prisma.technician.upsert({ where: { email: technician.email }, update: {}, create: technician });
  }
  for (const serviceType of serviceTypes) {
    await prisma.serviceType.upsert({ where: { name: serviceType.name }, update: {}, create: serviceType });
  }

  if ((await prisma.serviceRequest.count()) > 0) {
    return;
  }

  const technicianIds = new Map((await prisma.technician.findMany()).map((t) => [t.email, t.id]));
  const serviceTypeIds = new Map((await prisma.serviceType.findMany()).map((s) => [s.name, s.id]));

  await prisma.serviceRequest.createMany({
    data: sampleRequests.map(({ technicianEmail, serviceTypeName, ...request }) => ({
      ...request,
      technicianId: technicianEmail ? technicianIds.get(technicianEmail) : null,
      serviceTypeId: serviceTypeIds.get(serviceTypeName)!,
    })),
  });
}

// Runs only when executed directly (npm run db:seed, container start), not when imported by tests
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await seed();
  await prisma.$disconnect();
  console.log('Seed completed');
}
