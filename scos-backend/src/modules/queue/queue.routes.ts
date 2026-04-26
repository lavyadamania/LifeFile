import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import * as queueController from './queue.controller';
import { queueContextSchema, queueDelaySchema, queueNextSchema } from './queue.validator';

const queueRouter = Router();

queueRouter.use(authenticate);

queueRouter.get(
  '/:clinicId/:doctorId',
  validateRequest(queueContextSchema),
  asyncHandler(queueController.getStatus)
);

queueRouter.post(
  '/next',
  authorizeRoles(Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(queueNextSchema),
  asyncHandler(queueController.callNext)
);

queueRouter.patch(
  '/delay',
  authorizeRoles(Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(queueDelaySchema),
  asyncHandler(queueController.setDelay)
);

export { queueRouter };
