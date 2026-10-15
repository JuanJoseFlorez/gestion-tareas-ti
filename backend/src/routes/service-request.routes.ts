import { Router } from 'express';
import { serviceRequestController } from '../controllers/service-request.controller.js';

export const serviceRequestRouter = Router();

serviceRequestRouter.get('/service-requests', serviceRequestController.list);
serviceRequestRouter.post('/service-requests', serviceRequestController.create);
serviceRequestRouter.get('/service-requests/:id', serviceRequestController.getById);
serviceRequestRouter.put('/service-requests/:id', serviceRequestController.replace);
serviceRequestRouter.patch('/service-requests/:id', serviceRequestController.patch);
serviceRequestRouter.delete('/service-requests/:id', serviceRequestController.remove);
