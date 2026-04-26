import { z } from 'zod';

export const healthQuerySchema = z.object({
  query: z.object({
    deep: z
      .string()
      .optional()
      .transform((val) => val === 'true')
  })
});
