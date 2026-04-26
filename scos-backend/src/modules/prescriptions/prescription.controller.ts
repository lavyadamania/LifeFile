import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ok } from '../../utils/apiResponse';
import * as prescriptionService from './prescription.service';

export async function create(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await prescriptionService.createPrescription({
    actorUserId: user.userId,
    role: user.role,
    patientId: req.body.patientId,
    appointmentId: req.body.appointmentId,
    consultationLogId: req.body.consultationLogId,
    medicalRecordId: req.body.medicalRecordId,
    instructions: req.body.instructions,
    items: req.body.items
  });

  res.status(StatusCodes.CREATED).json(ok('Prescription created', payload));
}

export async function createTyped(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await prescriptionService.createTypedPrescription({
    actorUserId: user.userId,
    role: user.role,
    patientId: req.body.patientId,
    doctorId: req.body.doctorId,
    consultationId: req.body.consultationId,
    medicalRecordId: req.body.medicalRecordId,
    contentText: req.body.contentText
  });

  res.status(StatusCodes.CREATED).json(ok('Typed prescription created', payload));
}

export async function edit(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const prescriptionId = Array.isArray(req.params.prescriptionId)
    ? req.params.prescriptionId[0]
    : req.params.prescriptionId;

  const payload = await prescriptionService.editPrescription({
    actorUserId: user.userId,
    role: user.role,
    prescriptionId,
    contentText: req.body.contentText
  });

  res.status(StatusCodes.OK).json(ok('Prescription updated', payload));
}

export async function getVersions(req: Request, res: Response): Promise<void> {
  const prescriptionId = Array.isArray(req.params.prescriptionId)
    ? req.params.prescriptionId[0]
    : req.params.prescriptionId;

  const versions = await prescriptionService.getPrescriptionVersions(prescriptionId);

  res.status(StatusCodes.OK).json(ok('Prescription versions retrieved', { versions }));
}
