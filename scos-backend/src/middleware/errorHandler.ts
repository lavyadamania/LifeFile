import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

type ErrorPayload = {
  success: false;
  message: string;
  errors?: unknown;
};

export function notFoundHandler(req: Request, res: Response): void {
  const payload: ErrorPayload = {
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  };

  res.status(StatusCodes.NOT_FOUND).json(payload);
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Request failed', {
    method: req.method,
    path: req.originalUrl,
    error: error instanceof Error ? error.message : String(error)
  });

  if (error instanceof ZodError) {
    const payload: ErrorPayload = {
      success: false,
      message: 'Validation error',
      errors: error.flatten()
    };

    res.status(StatusCodes.BAD_REQUEST).json(payload);
    return;
  }

  if (error instanceof ApiError) {
    const payload: ErrorPayload = {
      success: false,
      message: error.message,
      ...(error.details !== undefined ? { errors: error.details } : {})
    };

    res.status(error.statusCode).json(payload);
    return;
  }

  const payload: ErrorPayload = {
    success: false,
    message: 'Internal server error'
  };

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(payload);
}
