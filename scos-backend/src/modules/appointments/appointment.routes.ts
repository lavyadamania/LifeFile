import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import * as appointmentController from './appointment.controller';
import {
  availableSlotsSchema,
  bookAppointmentSchema,
  cancelSchema,
  listDoctorsSchema,
  rescheduleSchema,
  updateStatusSchema,
  walkInSchema
} from './appointment.validator';

const appointmentRouter = Router();

appointmentRouter.get('/doctors/search', validateRequest(listDoctorsSchema), asyncHandler(appointmentController.listDoctors));
appointmentRouter.get('/slots', validateRequest(availableSlotsSchema), asyncHandler(appointmentController.availableSlots));

appointmentRouter.use(authenticate);

appointmentRouter.post(
  '/',
  authorizeRoles(Role.PATIENT, Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(bookAppointmentSchema),
  asyncHandler(appointmentController.book)
);

appointmentRouter.post(
  '/walk-ins',
  authorizeRoles(Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(walkInSchema),
  asyncHandler(appointmentController.createWalkIn)
);

appointmentRouter.patch(
  '/:appointmentId/cancel',
  authorizeRoles(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(cancelSchema),
  asyncHandler(appointmentController.cancel)
);

appointmentRouter.patch(
  '/:appointmentId/reschedule',
  authorizeRoles(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(rescheduleSchema),
  asyncHandler(appointmentController.reschedule)
);

appointmentRouter.patch(
  '/:appointmentId/status',
  authorizeRoles(Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(updateStatusSchema),
  asyncHandler(appointmentController.updateStatus)
);

export { appointmentRouter };
