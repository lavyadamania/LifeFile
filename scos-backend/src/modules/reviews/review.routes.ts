import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import * as reviewController from './review.controller';
import { createReviewSchema, updateReviewSchema } from './review.validator';

const reviewRouter = Router();

reviewRouter.get('/doctor/:doctorId/summary', asyncHandler(reviewController.summary));

reviewRouter.use(authenticate);

reviewRouter.post(
  '/',
  authorizeRoles(Role.PATIENT),
  validateRequest(createReviewSchema),
  asyncHandler(reviewController.create)
);

reviewRouter.patch(
  '/:reviewId',
  authorizeRoles(Role.PATIENT),
  validateRequest(updateReviewSchema),
  asyncHandler(reviewController.update)
);

export { reviewRouter };
