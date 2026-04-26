import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateRequest } from '../../middleware/validateRequest';
import * as adminController from './admin.controller';
import {
  createAvailabilitySchema,
  createClinicSchema,
  createSpecializationSchema
} from './admin.validator';

const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(authorizeRoles(Role.ADMIN, Role.CLINIC_STAFF));

adminRouter.post('/clinics', validateRequest(createClinicSchema), asyncHandler(adminController.createClinic));
adminRouter.post(
  '/specializations',
  validateRequest(createSpecializationSchema),
  asyncHandler(adminController.createSpecialization)
);
adminRouter.post(
  '/availability',
  validateRequest(createAvailabilitySchema),
  asyncHandler(adminController.createAvailability)
);
adminRouter.patch('/users/:userId/deactivate', asyncHandler(adminController.deactivateUser));
adminRouter.get('/search', asyncHandler(adminController.search));
adminRouter.get('/analytics', asyncHandler(adminController.analytics));

export { adminRouter };
