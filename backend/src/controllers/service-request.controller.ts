import type { Request, Response } from 'express';
import {
  idParamSchema,
  serviceRequestInputSchema,
  serviceRequestListQuerySchema,
  serviceRequestPatchSchema,
} from '../schemas/service-request.schemas.js';
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

  async create(req: Request, res: Response) {
    const input = serviceRequestInputSchema.parse(req.body);
    const created = await serviceRequestService.create(input);
    res.status(201).location(`/api/v1/service-requests/${created.id}`).json(created);
  },

  async replace(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const input = serviceRequestInputSchema.parse(req.body);
    res.status(200).json(await serviceRequestService.update(id, input));
  },

  async patch(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const changes = serviceRequestPatchSchema.parse(req.body);
    res.status(200).json(await serviceRequestService.update(id, changes));
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await serviceRequestService.remove(id);
    res.status(204).end();
  },
};
