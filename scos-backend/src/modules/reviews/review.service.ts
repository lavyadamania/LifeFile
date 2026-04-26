import { AppointmentStatus, Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import dayjs from 'dayjs';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';

async function refreshDoctorRating(doctorId: string) {
  const aggregate = await prisma.review.aggregate({
    where: {
      doctorId,
      moderationStatus: 'APPROVED'
    },
    _avg: { rating: true },
    _count: { _all: true }
  });

  await prisma.doctorProfile.updateMany({
    where: { doctorId },
    data: {
      avgRating: aggregate._avg.rating ?? 0,
      totalReviews: aggregate._count._all
    }
  });
}

export async function createReview(input: {
  actorUserId: string;
  role: Role;
  appointmentId: string;
  rating: number;
  comment?: string;
}) {
  if (input.role !== Role.PATIENT) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only patients can review');
  }

  const patient = await prisma.patient.findUnique({ where: { userId: input.actorUserId } });
  if (!patient) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Patient not found');
  }

  const appointment = await prisma.appointment.findUnique({ where: { id: input.appointmentId } });
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  if (appointment.patientId !== patient.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Cannot review another patient appointment');
  }

  if (appointment.status !== AppointmentStatus.COMPLETED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Review allowed only for completed appointments');
  }

  const existing = await prisma.review.findUnique({ where: { appointmentId: input.appointmentId } });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Review already exists for this appointment');
  }

  const review = await prisma.review.create({
    data: {
      appointmentId: input.appointmentId,
      patientId: patient.id,
      doctorId: appointment.doctorId,
      rating: input.rating,
      comment: input.comment,
      moderationStatus: 'APPROVED'
    }
  });

  await refreshDoctorRating(appointment.doctorId);

  return review;
}

export async function updateReview(input: {
  actorUserId: string;
  role: Role;
  reviewId: string;
  rating?: number;
  comment?: string;
}) {
  if (input.role !== Role.PATIENT) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only patients can edit reviews');
  }

  const patient = await prisma.patient.findUnique({ where: { userId: input.actorUserId } });
  if (!patient) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Patient not found');
  }

  const review = await prisma.review.findUnique({ where: { id: input.reviewId } });
  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  if (review.patientId !== patient.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Cannot update another patient review');
  }

  if (dayjs().diff(review.createdAt, 'day') > 2) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Review editing window has expired');
  }

  const updated = await prisma.review.update({
    where: { id: input.reviewId },
    data: {
      rating: input.rating,
      comment: input.comment
    }
  });

  await refreshDoctorRating(review.doctorId);
  return updated;
}

export async function doctorReviewSummary(doctorId: string) {
  const [aggregate, distribution] = await Promise.all([
    prisma.review.aggregate({
      where: { doctorId, moderationStatus: 'APPROVED' },
      _avg: { rating: true },
      _count: { _all: true }
    }),
    prisma.review.groupBy({
      by: ['rating'],
      where: { doctorId, moderationStatus: 'APPROVED' },
      _count: { _all: true }
    })
  ]);

  return {
    avgRating: aggregate._avg.rating ?? 0,
    totalReviews: aggregate._count._all,
    distribution
  };
}
