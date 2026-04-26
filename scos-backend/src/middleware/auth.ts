import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

type AccessPayload = {
  sub: string;
  role: Role;
};

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Missing bearer token'));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
    req.user = {
      userId: payload.sub,
      role: payload.role
    };
    next();
  } catch {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token'));
  }
}

export function authorizeRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(StatusCodes.UNAUTHORIZED, 'Not authenticated'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ApiError(StatusCodes.FORBIDDEN, 'Forbidden'));
      return;
    }

    next();
  };
}
