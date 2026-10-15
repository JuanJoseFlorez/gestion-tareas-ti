import type { Request, Response } from 'express';
import { idParamSchema, serviceRequestListQuerySchema } from '../schemas/service-request.schemas.js';
import { serviceRequestService } from '../services/service-request.service.js';

export const serviceRequestController = {
  async list(req: Request, res: Response) {
    const query = serviceRequestListQuerySchema.parse(req.query);
    res.status(200).json(await serviceRequestService.list(query));
  },

  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.status(200).json(await serviceRequestService.getById(id));
  },
};
