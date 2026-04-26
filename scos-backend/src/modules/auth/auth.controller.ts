import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ok } from '../../utils/apiResponse';
import * as authService from './auth.service';

export async function register(req: Request, res: Response): Promise<void> {
  const payload = await authService.registerPatient(req.body);
  res.status(StatusCodes.CREATED).json(ok('Registered successfully', payload));
}

export async function login(req: Request, res: Response): Promise<void> {
  const payload = await authService.login(req.body);
  res.status(StatusCodes.OK).json(ok('Login successful', payload));
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const payload = await authService.refresh(req.body);
  res.status(StatusCodes.OK).json(ok('Tokens refreshed', payload));
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.body);
  res.status(StatusCodes.OK).json(ok('Logout successful'));
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const payload = await authService.requestPasswordReset(req.body);
  res.status(StatusCodes.OK).json(ok('Password reset instructions issued', payload));
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(req.body);
  res.status(StatusCodes.OK).json(ok('Password updated successfully'));
}
