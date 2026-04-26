import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional()
  })
});

export const updateReviewSchema = z.object({
  params: z.object({
    reviewId: z.string().uuid()
  }),
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(2000).optional()
  })
});
