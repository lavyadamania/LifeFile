import { Role } from '@prisma/client';
import { z } from 'zod';

const allowedRegistrationRoles = [Role.PATIENT] as const;

export const registerSchema = z.object({
  body: z.object({
    email: z.email(),
    password: z.string().min(8).max(64),
    role: z.enum(allowedRegistrationRoles).default(Role.PATIENT),
    fullName: z.string().min(2),
    phone: z.string().optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email(),
    password: z.string().min(8).max(64)
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20)
  })
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20)
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.email()
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(20),
    newPassword: z.string().min(8).max(64)
  })
});
