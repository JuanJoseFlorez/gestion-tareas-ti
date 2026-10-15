import { z } from './zod.js';

export const activeQuerySchema = z.object({
  active: z
    .enum(['true', 'false'], { error: 'Debe ser "true" o "false".' })
    .transform((value) => value === 'true')
    .optional(),
});
