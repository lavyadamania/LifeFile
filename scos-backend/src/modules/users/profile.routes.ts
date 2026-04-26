import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import * as profileController from './profile.controller';
import {
  clinicAdminProfileCreateSchema,
  clinicAdminProfileUpdateSchema,
  doctorProfileCreateSchema,
  doctorProfileUpdateSchema,
  patientProfileCreateSchema,
  patientProfileUpdateSchema
} from './profile.validator';

const profileRouter = Router();

profileRouter.use(authenticate);

profileRouter.get('/patient/me', authorizeRoles(Role.PATIENT), asyncHandler(profileController.getOwnPatientProfile));
profileRouter.post(
  '/patient/me',
  authorizeRoles(Role.PATIENT),
  validateRequest(patientProfileCreateSchema),
  asyncHandler(profileController.createPatientProfile)
);
profileRouter.patch(
  '/patient/me',
  authorizeRoles(Role.PATIENT),
  validateRequest(patientProfileUpdateSchema),
  asyncHandler(profileController.updatePatientProfile)
);
profileRouter.delete('/patient/me', authorizeRoles(Role.PATIENT), asyncHandler(profileController.deletePatientProfile));

profileRouter.get('/doctor/me', authorizeRoles(Role.DOCTOR, Role.ADMIN), asyncHandler(profileController.getOwnDoctorProfile));
profileRouter.post(
  '/doctor/me',
  authorizeRoles(Role.DOCTOR, Role.ADMIN),
  validateRequest(doctorProfileCreateSchema),
  asyncHandler(profileController.createDoctorProfile)
);
profileRouter.patch(
  '/doctor/me',
  authorizeRoles(Role.DOCTOR, Role.ADMIN),
  validateRequest(doctorProfileUpdateSchema),
  asyncHandler(profileController.updateDoctorProfile)
);
profileRouter.delete(
  '/doctor/me',
  authorizeRoles(Role.DOCTOR, Role.ADMIN),
  asyncHandler(profileController.deleteDoctorProfile)
);

profileRouter.get(
  '/admin/me',
  authorizeRoles(Role.ADMIN, Role.CLINIC_STAFF),
  asyncHandler(profileController.getOwnClinicAdminProfile)
);
profileRouter.post(
  '/admin/me',
  authorizeRoles(Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(clinicAdminProfileCreateSchema),
  asyncHandler(profileController.createClinicAdminProfile)
);
profileRouter.patch(
  '/admin/me',
  authorizeRoles(Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(clinicAdminProfileUpdateSchema),
  asyncHandler(profileController.updateClinicAdminProfile)
);
profileRouter.delete(
  '/admin/me',
  authorizeRoles(Role.ADMIN, Role.CLINIC_STAFF),
  asyncHandler(profileController.deleteClinicAdminProfile)
);

export { profileRouter };
