import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import * as patientHealthFileController from './patient-health-file.controller';
import {
  downloadMedicalRecordPdfSchema,
  getUnifiedHealthFileSchema,
  searchTimelineSchema
} from './patient-health-file.validator';

const patientRouter = Router();

patientRouter.use(authenticate);

// Get unified health file (timeline view)
patientRouter.get(
  '/:patientId/health-file',
  validateRequest(getUnifiedHealthFileSchema),
  asyncHandler(patientHealthFileController.getUnifiedHealthFile)
);

// Search timeline
patientRouter.get(
  '/:patientId/timeline/search',
  validateRequest(searchTimelineSchema),
  asyncHandler(patientHealthFileController.searchTimeline)
);

// Download medical record PDF
patientRouter.get(
  '/:patientId/records/:recordId/pdf',
  validateRequest(downloadMedicalRecordPdfSchema),
  asyncHandler(patientHealthFileController.downloadMedicalRecordPdf)
);

export { patientRouter };
