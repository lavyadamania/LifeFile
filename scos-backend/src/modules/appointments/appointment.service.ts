import { AppointmentStatus, Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import dayjs from 'dayjs';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { upsertQueueTokenForAppointment, upsertQueueTokenForWalkIn } from '../queue/queue.service';

const ACTIVE_BOOKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.REQUESTED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_QUEUE,
  AppointmentStatus.IN_CONSULTATION
];

function paginate(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit
  };
}

export async function searchDoctors(query: {
  q?: string;
  specialization?: string;
  clinicId?: string;
  minRating?: number;
  page: number;
  limit: number;
}) {
  const whereName = query.q
    ? {
        OR: [
          {
            profile: {
              fullName: { contains: query.q, mode: 'insensitive' as const }
            }
          },
          {
            user: {
              email: { contains: query.q, mode: 'insensitive' as const }
            }
          }
        ]
      }
    : {};

  return prisma.doctor.findMany({
    where: {
      ...whereName,
      specialization: query.specialization
        ? {
            name: { equals: query.specialization, mode: 'insensitive' }
          }
        : undefined,
      profile: query.minRating !== undefined ? { avgRating: { gte: query.minRating } } : undefined,
      clinicDoctors: query.clinicId ? { some: { clinicId: query.clinicId } } : undefined
    },
    include: {
      profile: true,
      specialization: true,
      clinicDoctors: {
        include: {
          clinic: true
        }
      }
    },
    ...paginate(query.page, query.limit)
  });
}

export async function getAvailableSlots(input: {
  doctorId: string;
  clinicId: string;
  date: Date;
  slotMins: number;
}) {
  const dayStart = dayjs(input.date).startOf('day').toDate();
  const dayEnd = dayjs(input.date).endOf('day').toDate();

  const availability = await prisma.availabilitySlot.findMany({
    where: {
      clinicId: input.clinicId,
      clinicDoctor: { doctorId: input.doctorId },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart }
    },
    orderBy: { startsAt: 'asc' }
  });

  const blocked = await prisma.blockedSlot.findMany({
    where: {
      clinicId: input.clinicId,
      clinicDoctor: { doctorId: input.doctorId },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart }
    }
  });

  const booked = await prisma.appointment.findMany({
    where: {
      clinicId: input.clinicId,
      doctorId: input.doctorId,
      status: {
        in: [
          AppointmentStatus.REQUESTED,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.CHECKED_IN,
          AppointmentStatus.IN_QUEUE,
          AppointmentStatus.IN_CONSULTATION
        ]
      },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart }
    }
  });

  const slots: Array<{ startsAt: Date; endsAt: Date }> = [];

  for (const block of availability) {
    let cursor = new Date(block.startsAt);
    while (dayjs(cursor).add(input.slotMins, 'minute').toDate() <= block.endsAt) {
      const candidateEnd = dayjs(cursor).add(input.slotMins, 'minute').toDate();

      const hitsBlocked = blocked.some((b) => b.startsAt < candidateEnd && b.endsAt > cursor);
      const hitsBooked = booked.some((a) => a.startsAt < candidateEnd && a.endsAt > cursor);

      if (!hitsBlocked && !hitsBooked) {
        slots.push({ startsAt: new Date(cursor), endsAt: candidateEnd });
      }

      cursor = dayjs(cursor).add(input.slotMins, 'minute').toDate();
    }
  }

  return {
    date: dayStart,
    slotMins: input.slotMins,
    slots
  };
}

async function assertSlotAvailable(input: {
  doctorId: string;
  clinicId: string;
  startsAt: Date;
  endsAt: Date;
  excludedAppointmentId?: string;
}) {
  const availability = await prisma.availabilitySlot.findFirst({
    where: {
      clinicId: input.clinicId,
      clinicDoctor: {
        doctorId: input.doctorId
      },
      startsAt: { lte: input.startsAt },
      endsAt: { gte: input.endsAt }
    }
  });

  if (!availability) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Slot is outside doctor availability');
  }

  const blocked = await prisma.blockedSlot.findFirst({
    where: {
      clinicId: input.clinicId,
      clinicDoctor: { doctorId: input.doctorId },
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt }
    }
  });

  if (blocked) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Slot is blocked');
  }

  const overlap = await prisma.appointment.findFirst({
    where: {
      id: input.excludedAppointmentId ? { not: input.excludedAppointmentId } : undefined,
      doctorId: input.doctorId,
      clinicId: input.clinicId,
      status: { in: ACTIVE_BOOKING_STATUSES },
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt }
    }
  });

  if (overlap) {
    throw new ApiError(StatusCodes.CONFLICT, 'Overlapping appointment exists');
  }
}

async function assertPatientNoOverlap(input: {
  patientId: string;
  startsAt: Date;
  endsAt: Date;
  excludedAppointmentId?: string;
}) {
  const overlap = await prisma.appointment.findFirst({
    where: {
      id: input.excludedAppointmentId ? { not: input.excludedAppointmentId } : undefined,
      patientId: input.patientId,
      status: { in: ACTIVE_BOOKING_STATUSES },
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt }
    }
  });

  if (overlap) {
    throw new ApiError(StatusCodes.CONFLICT, 'Patient has an overlapping appointment');
  }
}

async function assertDoctorClinicAffiliation(doctorId: string, clinicId: string) {
  const exists = await prisma.clinicDoctor.findUnique({
    where: {
      clinicId_doctorId: {
        clinicId,
        doctorId
      }
    }
  });

  if (!exists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Doctor is not affiliated with this clinic');
  }
}

function assertStatusTransitionAllowed(from: AppointmentStatus, to: AppointmentStatus) {
  const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    REQUESTED: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
    CONFIRMED: [AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_QUEUE, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
    CHECKED_IN: [AppointmentStatus.IN_QUEUE, AppointmentStatus.IN_CONSULTATION, AppointmentStatus.CANCELLED],
    IN_QUEUE: [AppointmentStatus.IN_CONSULTATION, AppointmentStatus.CANCELLED],
    IN_CONSULTATION: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
    RESCHEDULED: []
  };

  if (!allowedTransitions[from].includes(to)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Invalid appointment status transition from ${from} to ${to}`
    );
  }
}

export async function bookAppointment(input: {
  actorUserId: string;
  actorRole: Role;
  doctorId: string;
  clinicId: string;
  patientId?: string;
  startsAt: Date;
  endsAt: Date;
  reason?: string;
  emergencyPriority: number;
  emergencyOverride?: boolean;
  emergencyOverrideReason?: string;
}) {
  if (input.actorRole !== Role.PATIENT && input.actorRole !== Role.ADMIN && input.actorRole !== Role.CLINIC_STAFF) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only patient or clinic staff can book appointments');
  }

  const patient =
    input.actorRole === Role.PATIENT
      ? await prisma.patient.findUnique({ where: { userId: input.actorUserId } })
      : input.patientId
        ? await prisma.patient.findUnique({ where: { id: input.patientId } })
        : null;
  if (!patient) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Patient account is required for booking');
  }

  const isEmergencyOverride = Boolean(input.emergencyOverride);

  const isStaffOrAdmin = input.actorRole === Role.ADMIN || input.actorRole === Role.CLINIC_STAFF;

  if (isEmergencyOverride && !isStaffOrAdmin) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Emergency override is restricted to clinic staff/admin');
  }

  if (isEmergencyOverride && !input.emergencyOverrideReason) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Emergency override reason is required');
  }

  if (!isEmergencyOverride) {
    await assertSlotAvailable(input);
  }

  await assertDoctorClinicAffiliation(input.doctorId, input.clinicId);
  await assertPatientNoOverlap({
    patientId: patient.id,
    startsAt: input.startsAt,
    endsAt: input.endsAt
  });

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: input.doctorId,
        clinicId: input.clinicId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: AppointmentStatus.CONFIRMED,
        reason: input.reason,
        emergencyPriority: input.emergencyPriority,
        cancellationPolicy: isEmergencyOverride
          ? 'Emergency override booking by clinic staff/admin.'
          : 'Cancellation allowed up to 4 hours before start.'
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'APPOINTMENT_BOOKED',
        resourceType: 'Appointment',
        resourceId: created.id,
        metadata: isEmergencyOverride
          ? {
              emergencyOverride: true,
              reason: input.emergencyOverrideReason
            }
          : undefined
      }
    });

    return created;
  });

  await upsertQueueTokenForAppointment(appointment.id);
  return appointment;
}

export async function cancelAppointment(input: {
  actorUserId: string;
  actorRole: Role;
  appointmentId: string;
  reason?: string;
}) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    include: { patient: true }
  });

  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  if (input.actorRole === Role.PATIENT && appointment.patient.userId !== input.actorUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Cannot cancel other patient appointment');
  }

  if (!ACTIVE_BOOKING_STATUSES.includes(appointment.status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Cannot cancel appointment in ${appointment.status} state`);
  }

  return prisma.$transaction(async (tx) => {
    const cancelled = await tx.appointment.update({
      where: { id: input.appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: input.reason
      }
    });

    await tx.queueToken.updateMany({
      where: { appointmentId: input.appointmentId, status: 'WAITING' },
      data: { status: 'CANCELLED' }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'APPOINTMENT_CANCELLED',
        resourceType: 'Appointment',
        resourceId: cancelled.id,
        metadata: {
          reason: input.reason
        }
      }
    });

    return cancelled;
  });
}

export async function rescheduleAppointment(input: {
  actorUserId: string;
  actorRole: Role;
  appointmentId: string;
  startsAt: Date;
  endsAt: Date;
}) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    include: { patient: true }
  });

  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  if (input.actorRole === Role.PATIENT && appointment.patient.userId !== input.actorUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Cannot reschedule another patient appointment');
  }

  if (
    appointment.status !== AppointmentStatus.REQUESTED &&
    appointment.status !== AppointmentStatus.CONFIRMED
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Cannot reschedule appointment in ${appointment.status} state`);
  }

  await assertSlotAvailable({
    doctorId: appointment.doctorId,
    clinicId: appointment.clinicId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    excludedAppointmentId: appointment.id
  });

  await assertPatientNoOverlap({
    patientId: appointment.patientId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    excludedAppointmentId: appointment.id
  });

  return prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointment.id },
      data: { status: AppointmentStatus.RESCHEDULED }
    });

    await tx.queueToken.updateMany({
      where: { appointmentId: appointment.id, status: 'WAITING' },
      data: { status: 'CANCELLED' }
    });

    const next = await tx.appointment.create({
      data: {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        clinicId: appointment.clinicId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: AppointmentStatus.CONFIRMED,
        reason: appointment.reason,
        rescheduledFromId: appointment.id,
        emergencyPriority: appointment.emergencyPriority,
        cancellationPolicy: appointment.cancellationPolicy
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'APPOINTMENT_RESCHEDULED',
        resourceType: 'Appointment',
        resourceId: next.id,
        metadata: { from: appointment.id }
      }
    });

    return next;
  });
}

export async function createWalkIn(input: {
  actorUserId: string;
  clinicId: string;
  doctorId?: string;
  visitorName: string;
  visitorPhone?: string;
  reason?: string;
  emergencyPriority: number;
}) {
  const walkIn = await prisma.$transaction(async (tx) => {
    const walkIn = await tx.walkIn.create({
      data: {
        clinicId: input.clinicId,
        doctorId: input.doctorId,
        visitorName: input.visitorName,
        visitorPhone: input.visitorPhone,
        reason: input.reason,
        emergencyPriority: input.emergencyPriority
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'WALK_IN_CREATED',
        resourceType: 'WalkIn',
        resourceId: walkIn.id
      }
    });

    return walkIn;
  });

  if (walkIn.doctorId) {
    await assertDoctorClinicAffiliation(walkIn.doctorId, walkIn.clinicId);
    await upsertQueueTokenForWalkIn(walkIn.id);
  }

  return walkIn;
}

export async function updateAppointmentStatus(input: {
  actorUserId: string;
  actorRole: Role;
  appointmentId: string;
  status: AppointmentStatus;
  reason?: string;
}) {
  const canManageLifecycle =
    input.actorRole === Role.DOCTOR ||
    input.actorRole === Role.ADMIN ||
    input.actorRole === Role.CLINIC_STAFF;

  if (!canManageLifecycle) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only doctor/admin/clinic staff can update appointment status');
  }

  const appointment = await prisma.appointment.findUnique({ where: { id: input.appointmentId } });
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  assertStatusTransitionAllowed(appointment.status, input.status);

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.appointment.update({
      where: { id: input.appointmentId },
      data: {
        status: input.status,
        cancellationReason: input.status === AppointmentStatus.CANCELLED ? input.reason : appointment.cancellationReason
      }
    });

    if (input.status === AppointmentStatus.CANCELLED) {
      await tx.queueToken.updateMany({
        where: {
          appointmentId: input.appointmentId,
          status: { in: ['WAITING', 'CALLED'] }
        },
        data: { status: 'CANCELLED' }
      });
    }

    if (input.status === AppointmentStatus.COMPLETED) {
      await tx.queueToken.updateMany({
        where: {
          appointmentId: input.appointmentId,
          status: { in: ['WAITING', 'CALLED'] }
        },
        data: {
          status: 'DONE',
          servedAt: new Date()
        }
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'APPOINTMENT_STATUS_UPDATED',
        resourceType: 'Appointment',
        resourceId: next.id,
        metadata: {
          from: appointment.status,
          to: input.status,
          reason: input.reason
        }
      }
    });

    return next;
  });

  return updated;
}
