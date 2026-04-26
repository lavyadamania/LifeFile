import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ok } from '../../utils/apiResponse';
import * as recordService from './record.service';

export async function createRecord(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await recordService.createMedicalRecord({
    actorUserId: user.userId,
    role: user.role,
    patientId: req.body.patientId,
    appointmentId: req.body.appointmentId,
    consultationLogId: req.body.consultationLogId,
    diagnosis: req.body.diagnosis,
    symptoms: req.body.symptoms,
    notes: req.body.notes,
    prescriptionSummary: req.body.prescriptionSummary,
    followUpInstructions: req.body.followUpInstructions,
    conditionTag: req.body.conditionTag,
    recordDate: req.body.recordDate
  });

  res.status(StatusCodes.CREATED).json(ok('Medical record created', payload));
}

export async function timeline(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;
  const payload = await recordService.getPatientTimeline({
    actorUserId: user.userId,
    role: user.role,
    patientId,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    condition: req.query.condition as string | undefined,
    doctorId: req.query.doctorId as string | undefined,
    page: Number(req.query.page ?? 1),
    limit: Number(req.query.limit ?? 20)
  });

  res.status(StatusCodes.OK).json(ok('Patient timeline fetched', payload));
}

export async function grantAccess(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await recordService.grantRecordAccess({
    actorUserId: user.userId,
    role: user.role,
    doctorId: req.body.doctorId,
    scope: req.body.scope,
    medicalRecordId: req.body.medicalRecordId,
    accessMethod: req.body.accessMethod,
    expiresAt: req.body.expiresAt
  });

  res.status(StatusCodes.CREATED).json(ok('Record access granted', payload));
}

export async function revokeAccess(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const permissionId = Array.isArray(req.params.permissionId)
    ? req.params.permissionId[0]
    : req.params.permissionId;
  const payload = await recordService.revokePermission({
    actorUserId: user.userId,
    role: user.role,
    permissionId
  });

  res.status(StatusCodes.OK).json(ok('Record access revoked', payload));
}
