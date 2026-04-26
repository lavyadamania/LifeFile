import { AccessMethod, PermissionScope } from '@prisma/client';
import { z } from 'zod';

export const createRecordSchema = z.object({
  body: z.object({
    patientId: z.string().uuid(),
    appointmentId: z.string().uuid().optional(),
    consultationLogId: z.string().uuid().optional(),
    diagnosis: z.string().optional(),
    symptoms: z.string().optional(),
    notes: z.string().optional(),
    prescriptionSummary: z.string().optional(),
    followUpInstructions: z.string().optional(),
    conditionTag: z.string().optional(),
    recordDate: z.coerce.date().default(() => new Date())
  })
});

export const timelineParamsSchema = z.object({
  params: z.object({
    patientId: z.string().uuid()
  }),
  query: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    condition: z.string().optional(),
    doctorId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
});

export const grantPermissionSchema = z.object({
  body: z.object({
    doctorId: z.string().uuid(),
    scope: z.nativeEnum(PermissionScope),
    accessMethod: z.nativeEnum(AccessMethod).default(AccessMethod.DIRECT),
    medicalRecordId: z.string().uuid().optional(),
    expiresAt: z.coerce.date().optional()
  })
});

export const revokePermissionSchema = z.object({
  params: z.object({
    permissionId: z.string().uuid()
  })
});
