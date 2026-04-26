import request from 'supertest';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { Role } from '@prisma/client';

jest.mock('../modules/users/profile.service', () => ({
  createPatientProfile: jest.fn(),
  getOwnPatientProfile: jest.fn(),
  updatePatientProfile: jest.fn(),
  deletePatientProfile: jest.fn(),
  createDoctorProfile: jest.fn(),
  getOwnDoctorProfile: jest.fn(),
  updateDoctorProfile: jest.fn(),
  deleteDoctorProfile: jest.fn(),
  createClinicAdminProfile: jest.fn(),
  getOwnClinicAdminProfile: jest.fn(),
  updateClinicAdminProfile: jest.fn(),
  deleteClinicAdminProfile: jest.fn()
}));

import { createApp } from '../app';
import { env } from '../config/env';
import * as profileService from '../modules/users/profile.service';

function bearerToken(role: Role, userId = 'user-1') {
  const token = jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: '15m'
  });
  return `Bearer ${token}`;
}

describe('Profile routes', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates patient profile', async () => {
    const mockedCreate = jest.mocked(profileService.createPatientProfile);
    mockedCreate.mockResolvedValue({ id: 'pp-1', fullName: 'Patient One' } as any);

    const body = {
      fullName: 'Patient One',
      dateOfBirth: '1998-01-10',
      gender: 'female',
      bloodGroup: 'O+',
      allergies: 'none',
      chronicConditions: 'none',
      emergencyContact: 'Parent',
      governmentId: 'ID-123',
      address: 'City'
    };

    const res = await request(app)
      .post('/api/v1/profiles/patient/me')
      .set('Authorization', bearerToken(Role.PATIENT, 'patient-user-1'))
      .send(body);

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Patient profile created');
    expect(mockedCreate).toHaveBeenCalledWith('patient-user-1', Role.PATIENT, expect.any(Object));
  });

  it('updates doctor profile with portfolio fields', async () => {
    const mockedUpdate = jest.mocked(profileService.updateDoctorProfile);
    mockedUpdate.mockResolvedValue({ id: 'dp-1', fullName: 'Dr Jane' } as any);

    const res = await request(app)
      .patch('/api/v1/profiles/doctor/me')
      .set('Authorization', bearerToken(Role.DOCTOR, 'doctor-user-1'))
      .send({
        fullName: 'Dr Jane',
        specializationId: '550e8400-e29b-41d4-a716-446655440000',
        experienceYears: 12,
        qualifications: 'MBBS, MD',
        clinicId: '550e8400-e29b-41d4-a716-446655440010',
        consultationFee: 1200,
        isPrimary: true,
        biography: 'Senior physician',
        languages: ['English', 'Hindi']
      });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Doctor profile updated');
    expect(mockedUpdate).toHaveBeenCalledWith('doctor-user-1', Role.DOCTOR, expect.any(Object));
  });

  it('fetches clinic admin profile', async () => {
    const mockedGet = jest.mocked(profileService.getOwnClinicAdminProfile);
    mockedGet.mockResolvedValue({ id: 'ca-1', userId: 'admin-user-1', clinic: null } as any);

    const res = await request(app)
      .get('/api/v1/profiles/admin/me')
      .set('Authorization', bearerToken(Role.ADMIN, 'admin-user-1'));

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Clinic admin profile fetched');
  });

  it('updates clinic staff profile', async () => {
    const mockedUpdate = jest.mocked(profileService.updateClinicAdminProfile);
    mockedUpdate.mockResolvedValue({ id: 'ca-2', userId: 'staff-user-1', clinic: null } as any);

    const res = await request(app)
      .patch('/api/v1/profiles/admin/me')
      .set('Authorization', bearerToken(Role.CLINIC_STAFF, 'staff-user-1'))
      .send({
        clinicId: '550e8400-e29b-41d4-a716-446655440011'
      });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Clinic admin profile updated');
    expect(mockedUpdate).toHaveBeenCalledWith('staff-user-1', Role.CLINIC_STAFF, expect.any(Object));
  });

  it('deletes patient profile', async () => {
    const mockedDelete = jest.mocked(profileService.deletePatientProfile);
    mockedDelete.mockResolvedValue(undefined);

    const res = await request(app)
      .delete('/api/v1/profiles/patient/me')
      .set('Authorization', bearerToken(Role.PATIENT, 'patient-user-2'));

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Patient profile deleted');
    expect(mockedDelete).toHaveBeenCalledWith('patient-user-2', Role.PATIENT);
  });

  it('rejects patient access to doctor profile routes', async () => {
    const res = await request(app)
      .patch('/api/v1/profiles/doctor/me')
      .set('Authorization', bearerToken(Role.PATIENT, 'patient-user-3'))
      .send({ biography: 'attempted overwrite' });

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
    expect(res.body.success).toBe(false);
  });
});
