import { LabOrderStatus, ReportStatus } from '@prisma/client';
import { z } from 'zod';

export const createLabOrderSchema = z.object({
  body: z.object({
    patientId: z.string().uuid(),
    doctorId: z.string().uuid(),
    appointmentId: z.string().uuid().optional(),
    medicalRecordId: z.string().uuid().optional(),
    labTestId: z.string().uuid()
  })
});

export const uploadLabReportSchema = z.object({
  body: z.object({
    labOrderId: z.string().uuid(),
    reportUrl: z.string().url(),
    status: z.nativeEnum(ReportStatus).default(ReportStatus.FINAL)
  })
});

export const updateLabOrderStatusSchema = z.object({
  params: z.object({
    orderId: z.string().uuid()
  }),
  body: z.object({
    status: z.nativeEnum(LabOrderStatus)
  })
});
