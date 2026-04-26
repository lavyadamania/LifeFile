import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ok } from '../../utils/apiResponse';
import * as reviewService from './review.service';

export async function create(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await reviewService.createReview({
    actorUserId: user.userId,
    role: user.role,
    appointmentId: req.body.appointmentId,
    rating: req.body.rating,
    comment: req.body.comment
  });

  res.status(StatusCodes.CREATED).json(ok('Review created', payload));
}

export async function update(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const reviewId = Array.isArray(req.params.reviewId) ? req.params.reviewId[0] : req.params.reviewId;
  const payload = await reviewService.updateReview({
    actorUserId: user.userId,
    role: user.role,
    reviewId,
    rating: req.body.rating,
    comment: req.body.comment
  });

  res.status(StatusCodes.OK).json(ok('Review updated', payload));
}

export async function summary(req: Request, res: Response): Promise<void> {
  const doctorId = Array.isArray(req.params.doctorId) ? req.params.doctorId[0] : req.params.doctorId;
  const payload = await reviewService.doctorReviewSummary(doctorId);
  res.status(StatusCodes.OK).json(ok('Doctor review summary fetched', payload));
}
