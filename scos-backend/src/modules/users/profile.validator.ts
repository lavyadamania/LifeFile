import { z } from 'zod';

const patientProfileBase = z.object({
  fullName: z.string().min(2).max(120),
  dateOfBirth: z.coerce.date(),
  gender: z.string().max(30).optional(),
  bloodGroup: z.string().max(10).optional(),
  allergies: z.string().max(1000).optional(),
  chronicConditions: z.string().max(1000).optional(),
  emergencyContact: z.string().max(120).optional(),
  governmentId: z.string().max(120).optional(),
  address: z.string().max(500).optional()
});

const doctorProfileBase = z.object({
  fullName: z.string().min(2).max(120),
  specializationId: z.string().uuid().optional(),
  experienceYears: z.number().int().nonnegative(),
  qualifications: z.string().min(2).max(500),
  clinicId: z.string().uuid().optional(),
  consultationFee: z.number().nonnegative().optional(),
  isPrimary: z.boolean().optional(),
  biography: z.string().max(2000).optional(),
  languages: z.array(z.string().min(2).max(50)).max(20).optional(),
  availability: z
    .array(
      z
        .object({
          clinicId: z.string().uuid(),
          startsAt: z.coerce.date(),
          endsAt: z.coerce.date(),
          isRecurring: z.boolean().optional(),
          recurrenceRule: z.string().max(255).optional()
        })
        .refine((slot) => slot.endsAt > slot.startsAt, {
          message: 'availability.endsAt must be greater than availability.startsAt',
          path: ['endsAt']
        })
    )
    .max(100)
    .optional()
});

const clinicAdminProfileBase = z.object({
  clinicId: z.string().uuid().nullable().optional(),
  note: z.string().max(500).optional()
});

function requireAtLeastOneKey<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
  });
}

export const patientProfileCreateSchema = z.object({
  body: patientProfileBase
});

export const patientProfileUpdateSchema = z.object({
  body: requireAtLeastOneKey(patientProfileBase.partial())
});

export const doctorProfileCreateSchema = z.object({
  body: doctorProfileBase
});

export const doctorProfileUpdateSchema = z.object({
  body: requireAtLeastOneKey(doctorProfileBase.partial())
});

export const clinicAdminProfileCreateSchema = z.object({
  body: clinicAdminProfileBase
});

export const clinicAdminProfileUpdateSchema = z.object({
  body: requireAtLeastOneKey(clinicAdminProfileBase)
});
