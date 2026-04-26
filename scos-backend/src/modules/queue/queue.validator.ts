import { z } from 'zod';

export const queueContextSchema = z.object({
  params: z.object({
    clinicId: z.string().uuid(),
    doctorId: z.string().uuid()
  })
});

export const queueNextSchema = z.object({
  body: z.object({
    clinicId: z.string().uuid(),
    doctorId: z.string().uuid()
  })
});

export const queueDelaySchema = z.object({
  body: z.object({
    clinicId: z.string().uuid(),
    doctorId: z.string().uuid(),
    delayMins: z.number().int().min(0).max(240)
  })
});
