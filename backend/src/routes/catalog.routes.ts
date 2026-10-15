import { Router } from 'express';
import { catalogController } from '../controllers/catalog.controller.js';

export const catalogRouter = Router();

catalogRouter.get('/technicians', catalogController.listTechnicians);
catalogRouter.get('/service-types', catalogController.listServiceTypes);
