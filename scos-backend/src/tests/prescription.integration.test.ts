import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

jest.mock('../modules/prescriptions/prescription.service', () => ({
  createPrescription: jest.fn(),
  createTypedPrescription: jest.fn()
}));

import { createApp } from '../app';
import { env } from '../config/env';
import * as prescriptionService from '../modules/prescriptions/prescription.service';

function bearerToken(role: Role, userId = 'doctor-user-1') {
  const token = jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: '15m'
  });
  return `Bearer ${token}`;
}

describe('Prescription routes', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates structured prescription', async () => {
    const mockedCreate = jest.mocked(prescriptionService.createPrescription);
    mockedCreate.mockResolvedValue({ prescription: { id: 'rx-1' }, warnings: {} } as any);

    const res = await request(app)
      .post('/api/v1/prescriptions')
      .set('Authorization', bearerToken(Role.DOCTOR))
      .send({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            medicineId: '550e8400-e29b-41d4-a716-446655440001',
            dosage: '500mg',
            frequency: 'BD',
            durationDays: 5
          }
        ]
      });

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Prescription created');
  });

  it('creates free-typed prescription and returns pdf payload', async () => {
    const mockedTyped = jest.mocked(prescriptionService.createTypedPrescription);
    mockedTyped.mockResolvedValue({
      prescription: {
        id: 'typed-rx-1',
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        doctorId: '550e8400-e29b-41d4-a716-446655440010',
        consultationId: '550e8400-e29b-41d4-a716-446655440020',
        contentText: 'Take medicine after food',
        createdAt: new Date('2026-04-24T00:00:00.000Z')
      },
      pdf: {
        fileUrl: '/storage/prescriptions/patient/typed-rx-1.pdf',
        fileName: 'typed-rx-1.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1200
      }
    } as any);

    const res = await request(app)
      .post('/api/v1/prescriptions/typed')
      .set('Authorization', bearerToken(Role.DOCTOR, 'doctor-user-1'))
      .send({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        consultationId: '550e8400-e29b-41d4-a716-446655440020',
        contentText: '1) Paracetamol 500mg\n2) 1 tab after meal for 3 days'
      });

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Typed prescription created');
    expect(res.body.data.pdf.mimeType).toBe('application/pdf');
  });

  it('rejects typed prescription creation by patient role', async () => {
    const res = await request(app)
      .post('/api/v1/prescriptions/typed')
      .set('Authorization', bearerToken(Role.PATIENT, 'patient-user-1'))
      .send({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        contentText: 'self note'
      });

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
    expect(res.body.success).toBe(false);
  });
});
