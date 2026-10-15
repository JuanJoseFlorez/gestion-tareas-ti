import type { Request, Response } from 'express';
import { serviceTypeRepository } from '../repositories/service-type.repository.js';
import { technicianRepository } from '../repositories/technician.repository.js';
import { activeQuerySchema } from '../schemas/catalog.schemas.js';

// Catalogs are read-only and have no business rules, so there is no service layer in between
export const catalogController = {
  async listTechnicians(req: Request, res: Response) {
    const { active } = activeQuerySchema.parse(req.query);
    res.status(200).json(await technicianRepository.list({ active }));
  },

  async listServiceTypes(req: Request, res: Response) {
    const { active } = activeQuerySchema.parse(req.query);
    res.status(200).json(await serviceTypeRepository.list({ active }));
  },
};
