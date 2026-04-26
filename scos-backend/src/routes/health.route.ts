import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller';
import { validateRequest } from '../middleware/validateRequest';
import { healthQuerySchema } from '../validators/health.validator';

const healthRouter = Router();

healthRouter.get('/', validateRequest(healthQuerySchema), healthCheck);

export { healthRouter };
