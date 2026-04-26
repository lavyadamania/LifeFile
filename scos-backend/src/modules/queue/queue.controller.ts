import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ok } from '../../utils/apiResponse';
import * as queueService from './queue.service';

export async function getStatus(req: Request, res: Response): Promise<void> {
  const payload = await queueService.getQueueStatus(
    String(req.params.clinicId),
    String(req.params.doctorId)
  );
  res.status(StatusCodes.OK).json(ok('Queue status fetched', payload));
}

export async function callNext(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await queueService.callNextPatient({
    clinicId: req.body.clinicId,
    doctorId: req.body.doctorId,
    actorUserId: user.userId,
    role: user.role
  });

  res.status(StatusCodes.OK).json(ok('Next patient called', payload));
}

export async function setDelay(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await queueService.updateDoctorDelay({
    clinicId: req.body.clinicId,
    doctorId: req.body.doctorId,
    delayMins: req.body.delayMins,
    actorUserId: user.userId
  });

  res.status(StatusCodes.OK).json(ok('Queue delay updated', payload));
}
