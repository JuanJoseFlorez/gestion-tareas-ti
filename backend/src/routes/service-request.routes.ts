import { Router } from 'express';
import { serviceRequestController } from '../controllers/service-request.controller.js';

export const serviceRequestRouter = Router();

serviceRequestRouter.get('/service-requests', serviceRequestController.list);
serviceRequestRouter.get('/service-requests/:id', serviceRequestController.getById);
