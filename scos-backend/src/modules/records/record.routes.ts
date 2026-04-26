import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import * as recordController from './record.controller';
import {
  createRecordSchema,
  grantPermissionSchema,
  revokePermissionSchema,
  timelineParamsSchema
} from './record.validator';

const recordRouter = Router();

recordRouter.use(authenticate);

recordRouter.post(
  '/',
  authorizeRoles(Role.DOCTOR, Role.ADMIN),
  validateRequest(createRecordSchema),
  asyncHandler(recordController.createRecord)
);

recordRouter.get(
  '/patient/:patientId/timeline',
  authorizeRoles(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF),
  validateRequest(timelineParamsSchema),
  asyncHandler(recordController.timeline)
);

recordRouter.post(
  '/share',
  authorizeRoles(Role.PATIENT),
  validateRequest(grantPermissionSchema),
  asyncHandler(recordController.grantAccess)
);

recordRouter.patch(
  '/share/:permissionId/revoke',
  authorizeRoles(Role.PATIENT, Role.ADMIN),
  validateRequest(revokePermissionSchema),
  asyncHandler(recordController.revokeAccess)
);

export { recordRouter };
