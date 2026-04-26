import { z } from 'zod';

export const createClinicSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    code: z.string().min(2),
    address: z.string().min(2),
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().min(2),
    postalCode: z.string().min(2),
    timezone: z.string().min(2),
    phone: z.string().optional(),
    email: z.email().optional()
  })
});

export const createSpecializationSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional()
  })
});

export const createAvailabilitySchema = z.object({
  body: z.object({
    clinicId: z.string().uuid(),
    clinicDoctorId: z.string().uuid(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    isRecurring: z.boolean().default(false),
    recurrenceRule: z.string().optional()
  })
});
