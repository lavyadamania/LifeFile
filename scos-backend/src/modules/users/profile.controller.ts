import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Role } from '@prisma/client';
import { ok } from '../../utils/apiResponse';
import * as profileService from './profile.service';

function ensureUser(req: Request) {
  const user = req.user;
  return user;
}

export async function createPatientProfile(req: Request, res: Response): Promise<void> {
  const user = ensureUser(req);
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const payload = await profileService.createPatientProfile(user.userId, user.role, req.body);
  res.status(StatusCodes.CREATED).json(ok('Patient profile created', payload));
}

export async function updatePatientProfile(req: Request, res: Response): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const payload = await profileService.updatePatientProfile(user.userId, user.role, req.body);
  res.status(StatusCodes.OK).json(ok('Patient profile updated', payload));
}

export async function getOwnPatientProfile(req: Request, res: Response): Promise<void> {
  const user = ensureUser(req);
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const payload = await profileService.getOwnPatientProfile(user.userId);
  res.status(StatusCodes.OK).json(ok('Patient profile fetched', payload));
}

export async function deletePatientProfile(req: Request, res: Response): Promise<void> {
  const user = ensureUser(req);
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    return;
  }

  await profileService.deletePatientProfile(user.userId, user.role);
  res.status(StatusCodes.OK).json(ok('Patient profile deleted'));
}

export async function createDoctorProfile(req: Request, res: Response): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (user.role !== Role.DOCTOR && user.role !== Role.ADMIN) {
    res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Forbidden' });
    return;
  }

  const payload = await profileService.createDoctorProfile(user.userId, user.role, req.body);
  res.status(StatusCodes.CREATED).json(ok('Doctor profile created', payload));
}

export async function updateDoctorProfile(req: Request, res: Response): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (user.role !== Role.DOCTOR && user.role !== Role.ADMIN) {
    res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Forbidden' });
    return;
  }

  const payload = await profileService.updateDoctorProfile(user.userId, user.role, req.body);
  res.status(StatusCodes.OK).json(ok('Doctor profile updated', payload));
}

export async function getOwnDoctorProfile(req: Request, res: Response): Promise<void> {
  const user = ensureUser(req);
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const payload = await profileService.getOwnDoctorProfile(user.userId);
  res.status(StatusCodes.OK).json(ok('Doctor profile fetched', payload));
}

export async function deleteDoctorProfile(req: Request, res: Response): Promise<void> {
  const user = ensureUser(req);
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (user.role !== Role.DOCTOR && user.role !== Role.ADMIN) {
    res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Forbidden' });
    return;
  }

  await profileService.deleteDoctorProfile(user.userId, user.role);
  res.status(StatusCodes.OK).json(ok('Doctor profile deleted'));
}

export async function createClinicAdminProfile(req: Request, res: Response): Promise<void> {
  const user = ensureUser(req);
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const payload = await profileService.createClinicAdminProfile(user.userId, user.role, req.body);
  res.status(StatusCodes.CREATED).json(ok('Clinic admin profile created', payload));
}

export async function getOwnClinicAdminProfile(req: Request, res: Response): Promise<void> {
  const user = ensureUser(req);
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const payload = await profileService.getOwnClinicAdminProfile(user.userId);
  res.status(StatusCodes.OK).json(ok('Clinic admin profile fetched', payload));
}

export async function updateClinicAdminProfile(req: Request, res: Response): Promise<void> {
  const user = ensureUser(req);
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const payload = await profileService.updateClinicAdminProfile(user.userId, user.role, req.body);
  res.status(StatusCodes.OK).json(ok('Clinic admin profile updated', payload));
}

export async function deleteClinicAdminProfile(req: Request, res: Response): Promise<void> {
  const user = ensureUser(req);
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
    return;
  }

  await profileService.deleteClinicAdminProfile(user.userId, user.role);
  res.status(StatusCodes.OK).json(ok('Clinic admin profile deleted'));
}
