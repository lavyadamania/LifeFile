import { z } from 'zod';

export const createPrescriptionSchema = z.object({
  body: z.object({
    patientId: z.string().uuid(),
    appointmentId: z.string().uuid().optional(),
    consultationLogId: z.string().uuid().optional(),
    medicalRecordId: z.string().uuid().optional(),
    instructions: z.string().optional(),
    items: z
      .array(
        z.object({
          medicineId: z.string().uuid(),
          dosage: z.string().min(1),
          frequency: z.string().min(1),
          durationDays: z.number().int().positive(),
          instructions: z.string().optional()
        })
      )
      .min(1)
  })
});

export const createTypedPrescriptionSchema = z.object({
  body: z.object({
    patientId: z.string().uuid(),
    doctorId: z.string().uuid().optional(),
    consultationId: z.string().uuid().optional(),
    contentText: z.string().min(1).max(20000),
    medicalRecordId: z.string().uuid().optional()
  })
});

export const editPrescriptionSchema = z.object({
  params: z.object({
    prescriptionId: z.string().uuid()
  }),
  body: z.object({
    contentText: z.string().min(1).max(20000)
  })
});

export const getPrescriptionVersionsSchema = z.object({
  params: z.object({
    prescriptionId: z.string().uuid()
  })
});
