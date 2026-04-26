import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ok } from '../../utils/apiResponse';
import * as patientHealthFileService from '../../services/patient-health-file.service';

export async function getUnifiedHealthFile(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const patientId = typeof req.params.patientId === 'string' ? req.params.patientId : req.params.patientId[0];

  const healthFile = await patientHealthFileService.getPatientUnifiedHealthFile({
    actorUserId: user.userId,
    role: user.role,
    patientId
  });

  res.status(StatusCodes.OK).json(ok('Unified health file retrieved', healthFile));
}

export async function downloadMedicalRecordPdf(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const patientId = typeof req.params.patientId === 'string' ? req.params.patientId : req.params.patientId[0];
  const recordId = typeof req.params.recordId === 'string' ? req.params.recordId : req.params.recordId[0];

  const pdfBuffer = await patientHealthFileService.generateMedicalRecordPdf({
    actorUserId: user.userId,
    role: user.role,
    patientId,
    recordId
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="medical_record_${recordId}.pdf"`);
  res.send(pdfBuffer);
}

export async function searchTimeline(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const patientId = typeof req.params.patientId === 'string' ? req.params.patientId : req.params.patientId[0];

  const timeline = await patientHealthFileService.searchPatientTimeline({
    actorUserId: user.userId,
    role: user.role,
    patientId,
    condition: req.query.condition as string | undefined,
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    doctor: req.query.doctor as string | undefined
  });

  res.status(StatusCodes.OK).json(ok('Timeline search results', { results: timeline, count: timeline.length }));
}
