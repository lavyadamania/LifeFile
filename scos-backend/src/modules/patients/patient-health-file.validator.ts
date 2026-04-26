import { z } from 'zod';

export const getUnifiedHealthFileSchema = z.object({
  params: z.object({
    patientId: z.string().uuid()
  })
});

export const downloadMedicalRecordPdfSchema = z.object({
  params: z.object({
    patientId: z.string().uuid(),
    recordId: z.string().uuid()
  })
});

export const searchTimelineSchema = z.object({
  params: z.object({
    patientId: z.string().uuid()
  }),
  query: z.object({
    condition: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    doctor: z.string().optional()
  })
});
