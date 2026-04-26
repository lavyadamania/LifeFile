import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { hashToken } from '../../utils/crypto';

function issueAccessToken(userId: string, role: Role): string {
  return jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn']
  });
}

function issueRefreshToken(userId: string): string {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: userId,
    expiresIn: env.REFRESH_TOKEN_TTL as jwt.SignOptions['expiresIn']
  });
}

function issuePasswordResetToken(userId: string): string {
  return jwt.sign({ purpose: 'password_reset' }, env.JWT_PASSWORD_RESET_SECRET, {
    subject: userId,
    jwtid: randomUUID(),
    expiresIn: env.PASSWORD_RESET_TOKEN_TTL as jwt.SignOptions['expiresIn']
  });
}

function extractExpiry(token: string): Date {
  const payload = jwt.decode(token) as jwt.JwtPayload | null;
  if (!payload?.exp) {
    return new Date(Date.now() + 60 * 60 * 1000);
  }
  return new Date(payload.exp * 1000);
}

export async function registerPatient(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: Role.PATIENT
      }
    });

    const patient = await tx.patient.create({
      data: {
        userId: user.id,
        mrn: `MRN-${Date.now()}`
      }
    });

    await tx.patientProfile.create({
      data: {
        patientId: patient.id,
        fullName: input.fullName,
        dateOfBirth: new Date('2000-01-01')
      }
    });

    return { user, patient };
  });

  const accessToken = issueAccessToken(created.user.id, created.user.role);
  const refreshToken = issueRefreshToken(created.user.id);

  await prisma.sessionToken.create({
    data: {
      userId: created.user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: extractExpiry(refreshToken)
    }
  });

  return {
    user: {
      id: created.user.id,
      email: created.user.email,
      role: created.user.role
    },
    tokens: {
      accessToken,
      refreshToken
    }
  };
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  const matched = await bcrypt.compare(input.password, user.passwordHash);
  if (!matched) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  const accessToken = issueAccessToken(user.id, user.role);
  const refreshToken = issueRefreshToken(user.id);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.sessionToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: extractExpiry(refreshToken)
      }
    })
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    tokens: {
      accessToken,
      refreshToken
    }
  };
}

export async function refresh(input: { refreshToken: string }) {
  let subject: string;

  try {
    const payload = jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
    subject = payload.sub as string;
  } catch {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid refresh token');
  }

  const tokenHash = hashToken(input.refreshToken);
  const session = await prisma.sessionToken.findUnique({ where: { tokenHash } });

  if (!session || session.userId !== subject || session.revokedAt || session.expiresAt < new Date()) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh token revoked or expired');
  }

  const user = await prisma.user.findUnique({ where: { id: subject } });
  if (!user || !user.isActive) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found');
  }

  const nextRefreshToken = issueRefreshToken(user.id);
  const nextAccessToken = issueAccessToken(user.id, user.role);

  await prisma.$transaction([
    prisma.sessionToken.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        replacedById: hashToken(nextRefreshToken)
      }
    }),
    prisma.sessionToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(nextRefreshToken),
        expiresAt: extractExpiry(nextRefreshToken)
      }
    })
  ]);

  return {
    tokens: {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken
    }
  };
}

export async function logout(input: { refreshToken: string }) {
  const tokenHash = hashToken(input.refreshToken);
  await prisma.sessionToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function requestPasswordReset(input: { email: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.isActive) {
    return {
      issued: true,
      ...(env.NODE_ENV !== 'production' ? { resetToken: null as string | null } : {})
    };
  }

  const resetToken = issuePasswordResetToken(user.id);

  await prisma.sessionToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(resetToken),
      expiresAt: extractExpiry(resetToken)
    }
  });

  return {
    issued: true,
    ...(env.NODE_ENV !== 'production' ? { resetToken } : {})
  };
}

export async function resetPassword(input: { token: string; newPassword: string }) {
  let subject: string;

  try {
    const payload = jwt.verify(input.token, env.JWT_PASSWORD_RESET_SECRET) as jwt.JwtPayload;
    if (payload.purpose !== 'password_reset') {
      throw new Error('Invalid token purpose');
    }
    subject = payload.sub as string;
  } catch {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired password reset token');
  }

  const tokenHash = hashToken(input.token);
  const session = await prisma.sessionToken.findUnique({ where: { tokenHash } });
  if (!session || session.userId !== subject || session.revokedAt || session.expiresAt < new Date()) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired password reset token');
  }

  const user = await prisma.user.findUnique({ where: { id: subject } });
  if (!user || !user.isActive) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const sameAsOld = await bcrypt.compare(input.newPassword, user.passwordHash);
  if (sameAsOld) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'New password must be different from current password');
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash } }),
    prisma.sessionToken.updateMany({
      where: {
        userId: user.id,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    })
  ]);
}
