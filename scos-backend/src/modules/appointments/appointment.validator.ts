import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';

export const listDoctorsSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    specialization: z.string().optional(),
    clinicId: z.string().uuid().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
});

export const bookAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string().uuid(),
    clinicId: z.string().uuid(),
    patientId: z.string().uuid().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    reason: z.string().optional(),
    emergencyPriority: z.number().int().min(0).max(100).default(0),
    emergencyOverride: z.boolean().optional().default(false),
    emergencyOverrideReason: z.string().min(3).optional()
  }).refine((value) => value.endsAt > value.startsAt, {
    message: 'endsAt must be greater than startsAt',
    path: ['endsAt']
  })
});

export const availableSlotsSchema = z.object({
  query: z.object({
    doctorId: z.string().uuid(),
    clinicId: z.string().uuid(),
    date: z.coerce.date(),
    slotMins: z.coerce.number().int().min(5).max(60).default(15)
  })
});

export const appointmentIdParamSchema = z.object({
  params: z.object({
    appointmentId: z.string().uuid()
  })
});

export const cancelSchema = z.object({
  params: z.object({
    appointmentId: z.string().uuid()
  }),
  body: z.object({
    reason: z.string().max(500).optional()
  }).default({})
});

export const rescheduleSchema = z.object({
  params: z.object({
    appointmentId: z.string().uuid()
  }),
  body: z.object({
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date()
  }).refine((value) => value.endsAt > value.startsAt, {
    message: 'endsAt must be greater than startsAt',
    path: ['endsAt']
  })
});

export const walkInSchema = z.object({
  body: z.object({
    clinicId: z.string().uuid(),
    doctorId: z.string().uuid().optional(),
    visitorName: z.string().min(2),
    visitorPhone: z.string().optional(),
    reason: z.string().optional(),
    emergencyPriority: z.number().int().min(0).max(100).default(0)
  })
});

const allowedManualStatusTransitions = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_QUEUE,
  AppointmentStatus.IN_CONSULTATION,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW
] as const;

export const updateStatusSchema = z.object({
  params: z.object({
    appointmentId: z.string().uuid()
  }),
  body: z.object({
    status: z.enum(allowedManualStatusTransitions),
    reason: z.string().max(500).optional()
  })
});
