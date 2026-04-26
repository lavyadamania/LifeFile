import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_PASSWORD_RESET_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  PASSWORD_RESET_TOKEN_TTL: z.string().default('15m'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(16).default(12),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  STORAGE_DIR: z.string().default('storage'),
  STORAGE_PUBLIC_BASE_URL: z.string().default('/storage')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
