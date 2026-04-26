import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ok } from '../../utils/apiResponse';
import * as adminService from './admin.service';

export async function createClinic(req: Request, res: Response): Promise<void> {
  const payload = await adminService.createClinic(req.body);
  res.status(StatusCodes.CREATED).json(ok('Clinic created', payload));
}

export async function createSpecialization(req: Request, res: Response): Promise<void> {
  const payload = await adminService.createSpecialization(req.body);
  res.status(StatusCodes.CREATED).json(ok('Specialization saved', payload));
}

export async function createAvailability(req: Request, res: Response): Promise<void> {
  const payload = await adminService.createAvailability(req.body);
  res.status(StatusCodes.CREATED).json(ok('Availability slot created', payload));
}

export async function deactivateUser(req: Request, res: Response): Promise<void> {
  const payload = await adminService.deactivateUser(String(req.params.userId));
  res.status(StatusCodes.OK).json(ok('User deactivated', payload));
}

export async function search(req: Request, res: Response): Promise<void> {
  const payload = await adminService.searchEntities({
    doctors: req.query.doctors as string | undefined,
    patients: req.query.patients as string | undefined,
    recordsCondition: req.query.condition as string | undefined,
    appointmentStatus: req.query.appointmentStatus as string | undefined,
    labStatus: req.query.labStatus as string | undefined
  });

  res.status(StatusCodes.OK).json(ok('Search completed', payload));
}

export async function analytics(req: Request, res: Response): Promise<void> {
  const payload = await adminService.analytics();
  res.status(StatusCodes.OK).json(ok('Analytics fetched', payload));
}
