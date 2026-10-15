import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { serviceRequestRouter } from './routes/service-request.routes.js';
import { healthRouter } from './routes/health.routes.js';

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use('/api/v1', healthRouter);
app.use('/api/v1', catalogRouter);
app.use('/api/v1', serviceRequestRouter);

app.use(notFoundHandler);
app.use(errorHandler);
