import { z } from './zod.js';

export const REQUEST_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const REQUEST_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

const REQUIRED = 'Es obligatorio.';

const requiredText = (max: number) =>
  z
    .string({ error: REQUIRED })
    .trim()
    .min(1, { error: REQUIRED })
    .max(max, { error: `Debe tener máximo ${max} caracteres.` });

// No coercion: ids in a JSON body must be real numbers
const entityId = (message: string) =>
  z.number({ error: message }).int({ error: message }).positive({ error: message });

/** Body of POST and PUT: every field is required (technicianId may be null = unassigned). */
export const serviceRequestInputSchema = z.object({
  title: requiredText(150),
  description: requiredText(2000),
  requesterName: requiredText(120),
  requesterEmail: z
    .string({ error: REQUIRED })
    .trim()
    .min(1, { error: REQUIRED })
    .pipe(
      z.email({ error: 'Debe ser un correo electrónico válido.' }).max(150, { error: 'Debe tener máximo 150 caracteres.' }),
    ),
  priority: z.enum(REQUEST_PRIORITIES, { error: 'Prioridad no válida.' }),
  status: z.enum(REQUEST_STATUSES, { error: 'Estado no válido.' }),
  technicianId: entityId('Debe ser el id de un técnico o null.').nullable(),
  serviceTypeId: entityId('Debe ser el id de un tipo de servicio.'),
});
export type ServiceRequestInput = z.infer<typeof serviceRequestInputSchema>;

/** Body of PATCH: any subset of the input fields, but at least one. */
export const serviceRequestPatchSchema = serviceRequestInputSchema
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, { error: 'Debe enviar al menos un campo.' });
export type ServiceRequestPatch = z.infer<typeof serviceRequestPatchSchema>;

const queryId = z.coerce.number().int().positive();

export const serviceRequestListQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  status: z.enum(REQUEST_STATUSES).optional(),
  priority: z.enum(REQUEST_PRIORITIES).optional(),
  technicianId: z.union([z.literal('unassigned'), queryId]).optional(),
  serviceTypeId: queryId.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
export type ServiceRequestListQuery = z.infer<typeof serviceRequestListQuerySchema>;

export const idParamSchema = z.object({
  id: z.coerce
    .number({ error: 'Debe ser un número entero positivo.' })
    .int({ error: 'Debe ser un número entero positivo.' })
    .positive({ error: 'Debe ser un número entero positivo.' }),
});
