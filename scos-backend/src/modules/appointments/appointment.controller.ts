import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ok } from '../../utils/apiResponse';
import * as appointmentService from './appointment.service';

export async function listDoctors(req: Request, res: Response): Promise<void> {
  const payload = await appointmentService.searchDoctors({
    q: req.query.q as string | undefined,
    specialization: req.query.specialization as string | undefined,
    clinicId: req.query.clinicId as string | undefined,
    minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
    page: Number(req.query.page ?? 1),
    limit: Number(req.query.limit ?? 20)
  });

  res.status(StatusCodes.OK).json(ok('Doctors fetched', payload));
}

export async function availableSlots(req: Request, res: Response): Promise<void> {
  const payload = await appointmentService.getAvailableSlots({
    doctorId: String(req.query.doctorId),
    clinicId: String(req.query.clinicId),
    date: new Date(String(req.query.date)),
    slotMins: Number(req.query.slotMins ?? 15)
  });

  res.status(StatusCodes.OK).json(ok('Available slots fetched', payload));
}

export async function book(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await appointmentService.bookAppointment({
    actorUserId: user.userId,
    actorRole: user.role,
    doctorId: req.body.doctorId,
    clinicId: req.body.clinicId,
    patientId: req.body.patientId,
    startsAt: req.body.startsAt,
    endsAt: req.body.endsAt,
    reason: req.body.reason,
    emergencyPriority: req.body.emergencyPriority,
    emergencyOverride: req.body.emergencyOverride,
    emergencyOverrideReason: req.body.emergencyOverrideReason
  });
  res.status(StatusCodes.CREATED).json(ok('Appointment booked', payload));
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await appointmentService.cancelAppointment({
    actorUserId: user.userId,
    actorRole: user.role,
    appointmentId: String(req.params.appointmentId),
    reason: req.body.reason as string | undefined
  });
  res.status(StatusCodes.OK).json(ok('Appointment cancelled', payload));
}

export async function reschedule(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await appointmentService.rescheduleAppointment({
    actorUserId: user.userId,
    actorRole: user.role,
    appointmentId: String(req.params.appointmentId),
    startsAt: req.body.startsAt,
    endsAt: req.body.endsAt
  });
  res.status(StatusCodes.OK).json(ok('Appointment rescheduled', payload));
}

export async function createWalkIn(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await appointmentService.createWalkIn({
    actorUserId: user.userId,
    clinicId: req.body.clinicId,
    doctorId: req.body.doctorId,
    visitorName: req.body.visitorName,
    visitorPhone: req.body.visitorPhone,
    reason: req.body.reason,
    emergencyPriority: req.body.emergencyPriority
  });
  res.status(StatusCodes.CREATED).json(ok('Walk-in created', payload));
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const payload = await appointmentService.updateAppointmentStatus({
    actorUserId: user.userId,
    actorRole: user.role,
    appointmentId: String(req.params.appointmentId),
    status: req.body.status,
    reason: req.body.reason
  });

  res.status(StatusCodes.OK).json(ok('Appointment status updated', payload));
}
