import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import * as prescriptionController from './prescription.controller';
import {
  createPrescriptionSchema,
  createTypedPrescriptionSchema,
  editPrescriptionSchema,
  getPrescriptionVersionsSchema
} from './prescription.validator';

const prescriptionRouter = Router();

prescriptionRouter.use(authenticate);
prescriptionRouter.post(
  '/',
  authorizeRoles(Role.DOCTOR, Role.ADMIN),
  validateRequest(createPrescriptionSchema),
  asyncHandler(prescriptionController.create)
);
prescriptionRouter.post(
  '/typed',
  authorizeRoles(Role.DOCTOR, Role.ADMIN),
  validateRequest(createTypedPrescriptionSchema),
  asyncHandler(prescriptionController.createTyped)
);
prescriptionRouter.patch(
  '/:prescriptionId',
  authorizeRoles(Role.DOCTOR, Role.ADMIN),
  validateRequest(editPrescriptionSchema),
  asyncHandler(prescriptionController.edit)
);
prescriptionRouter.get(
  '/:prescriptionId/versions',
  validateRequest(getPrescriptionVersionsSchema),
  asyncHandler(prescriptionController.getVersions)
);

export { prescriptionRouter };
