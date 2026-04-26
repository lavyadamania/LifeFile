import request from 'supertest';
import jwt from 'jsonwebtoken';
import { AppointmentStatus, Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

jest.mock('../modules/appointments/appointment.service', () => ({
  searchDoctors: jest.fn(),
  getAvailableSlots: jest.fn(),
  bookAppointment: jest.fn(),
  cancelAppointment: jest.fn(),
  rescheduleAppointment: jest.fn(),
  createWalkIn: jest.fn(),
  updateAppointmentStatus: jest.fn()
}));

import { createApp } from '../app';
import { env } from '../config/env';
import * as appointmentService from '../modules/appointments/appointment.service';

function bearerToken(role: Role, userId = 'user-1') {
  const token = jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: '15m'
  });
  return `Bearer ${token}`;
}

describe('Appointment routes', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches doctors publicly', async () => {
    const mockedSearch = jest.mocked(appointmentService.searchDoctors);
    mockedSearch.mockResolvedValue([{ id: 'doctor-1' }] as any);

    const res = await request(app).get('/api/v1/appointments/doctors/search').query({
      q: 'john',
      page: 1,
      limit: 10
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Doctors fetched');
  });

  it('views availability publicly', async () => {
    const mockedSlots = jest.mocked(appointmentService.getAvailableSlots);
    mockedSlots.mockResolvedValue({ date: new Date(), slotMins: 15, slots: [] } as any);

    const res = await request(app).get('/api/v1/appointments/slots').query({
      doctorId: '550e8400-e29b-41d4-a716-446655440000',
      clinicId: '550e8400-e29b-41d4-a716-446655440001',
      date: '2026-05-01'
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Available slots fetched');
  });

  it('books an appointment for patient role', async () => {
    const mockedBook = jest.mocked(appointmentService.bookAppointment);
    mockedBook.mockResolvedValue({ id: 'appt-1', status: AppointmentStatus.CONFIRMED } as any);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', bearerToken(Role.PATIENT, 'patient-user-1'))
      .send({
        doctorId: '550e8400-e29b-41d4-a716-446655440000',
        clinicId: '550e8400-e29b-41d4-a716-446655440001',
        startsAt: '2026-05-01T10:00:00.000Z',
        endsAt: '2026-05-01T10:30:00.000Z',
        emergencyPriority: 0
      });

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Appointment booked');
  });

  it('cancels appointment for authorized roles', async () => {
    const mockedCancel = jest.mocked(appointmentService.cancelAppointment);
    mockedCancel.mockResolvedValue({ id: 'appt-2', status: AppointmentStatus.CANCELLED } as any);

    const res = await request(app)
      .patch('/api/v1/appointments/550e8400-e29b-41d4-a716-446655440010/cancel')
      .set('Authorization', bearerToken(Role.DOCTOR, 'doctor-user-1'))
      .send({ reason: 'Patient unavailable' });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Appointment cancelled');
  });

  it('reschedules appointment for patient role', async () => {
    const mockedReschedule = jest.mocked(appointmentService.rescheduleAppointment);
    mockedReschedule.mockResolvedValue({ id: 'appt-3', status: AppointmentStatus.CONFIRMED } as any);

    const res = await request(app)
      .patch('/api/v1/appointments/550e8400-e29b-41d4-a716-446655440011/reschedule')
      .set('Authorization', bearerToken(Role.PATIENT, 'patient-user-2'))
      .send({
        startsAt: '2026-05-01T11:00:00.000Z',
        endsAt: '2026-05-01T11:30:00.000Z'
      });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Appointment rescheduled');
  });

  it('supports walk-ins by clinic staff', async () => {
    const mockedWalkIn = jest.mocked(appointmentService.createWalkIn);
    mockedWalkIn.mockResolvedValue({ id: 'walk-in-1' } as any);

    const res = await request(app)
      .post('/api/v1/appointments/walk-ins')
      .set('Authorization', bearerToken(Role.CLINIC_STAFF, 'staff-user-1'))
      .send({
        clinicId: '550e8400-e29b-41d4-a716-446655440001',
        doctorId: '550e8400-e29b-41d4-a716-446655440000',
        visitorName: 'Walk In Visitor',
        emergencyPriority: 20
      });

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Walk-in created');
  });

  it('updates status lifecycle for authorized role', async () => {
    const mockedUpdateStatus = jest.mocked(appointmentService.updateAppointmentStatus);
    mockedUpdateStatus.mockResolvedValue({ id: 'appt-4', status: AppointmentStatus.CHECKED_IN } as any);

    const res = await request(app)
      .patch('/api/v1/appointments/550e8400-e29b-41d4-a716-446655440012/status')
      .set('Authorization', bearerToken(Role.ADMIN, 'admin-user-1'))
      .send({ status: 'CHECKED_IN' });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Appointment status updated');
  });

  it('forbids patient from status lifecycle route', async () => {
    const res = await request(app)
      .patch('/api/v1/appointments/550e8400-e29b-41d4-a716-446655440013/status')
      .set('Authorization', bearerToken(Role.PATIENT, 'patient-user-5'))
      .send({ status: 'CHECKED_IN' });

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
    expect(res.body.success).toBe(false);
  });
});
