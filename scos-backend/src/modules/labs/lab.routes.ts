import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import * as labController from './lab.controller';
import { createLabOrderSchema, updateLabOrderStatusSchema, uploadLabReportSchema } from './lab.validator';

const labRouter = Router();

labRouter.use(authenticate);

labRouter.post(
  '/orders',
  authorizeRoles(Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(createLabOrderSchema),
  asyncHandler(labController.createOrder)
);

labRouter.post(
  '/reports',
  authorizeRoles(Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(uploadLabReportSchema),
  asyncHandler(labController.uploadReport)
);

labRouter.patch(
  '/orders/:orderId/status',
  authorizeRoles(Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(updateLabOrderStatusSchema),
  asyncHandler(labController.updateOrderStatus)
);

export { labRouter };
