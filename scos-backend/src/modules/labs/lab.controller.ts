import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ok } from '../../utils/apiResponse';
import * as labService from './lab.service';

export async function createOrder(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await labService.createLabOrder({
    actorUserId: user.userId,
    role: user.role,
    patientId: req.body.patientId,
    doctorId: req.body.doctorId,
    appointmentId: req.body.appointmentId,
    medicalRecordId: req.body.medicalRecordId,
    labTestId: req.body.labTestId
  });

  res.status(StatusCodes.CREATED).json(ok('Lab order created', payload));
}

export async function uploadReport(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await labService.uploadLabReport({
    actorUserId: user.userId,
    role: user.role,
    labOrderId: req.body.labOrderId,
    reportUrl: req.body.reportUrl,
    status: req.body.status
  });

  res.status(StatusCodes.CREATED).json(ok('Lab report uploaded', payload));
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await labService.updateLabOrderStatus({
    actorUserId: user.userId,
    role: user.role,
    orderId: String(req.params.orderId),
    status: req.body.status
  });

  res.status(StatusCodes.OK).json(ok('Lab order status updated', payload));
}
