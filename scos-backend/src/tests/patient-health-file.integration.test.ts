import request from 'supertest';
import { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

jest.mock('../middleware/auth', () => {
  return {
    authenticate: (req: Request, _res: Response, next: NextFunction): void => {
      req.user = {
        userId: String(req.header('x-test-user-id') ?? 'test-user-id'),
        role: (req.header('x-test-role') as Role | undefined) ?? Role.DOCTOR
      };
      next();
    }
  };
});

jest.mock('../services/patient-health-file.service', () => ({
  getPatientUnifiedHealthFile: jest.fn(),
  generateMedicalRecordPdf: jest.fn(),
  searchPatientTimeline: jest.fn()
}));

import { createApp } from '../app';
import * as patientHealthFileService from '../services/patient-health-file.service';
import { ApiError } from '../utils/ApiError';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';
const RECORD_ID = '33333333-3333-4333-8333-333333333333';
const ADMIN_ID = '44444444-4444-4444-8444-444444444444';

describe('Patient Health File routes', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/patients/:patientId/health-file', () => {
    it('returns unified health file for patient accessing own record', async () => {
      const mockHealthFile = {
        patientId: PATIENT_ID,
        patientName: 'John Doe',
        patientMRN: 'MRN-001',
        patientDOB: '1990-01-15',
        patientGender: 'MALE',
        timeline: [
          {
            id: 'rx-1',
            type: 'PRESCRIPTION' as const,
            date: new Date('2024-01-20'),
            title: 'Prescription',
            description: 'Aspirin 500mg, twice daily',
            doctor: 'Dr. Smith',
            doctorId: DOCTOR_ID,
            prescriptionId: 'rx-1',
            rawData: { contentText: 'Aspirin 500mg', itemCount: 1, currentVersion: 1 }
          },
          {
            id: 'visit-1',
            type: 'VISIT' as const,
            date: new Date('2024-01-20'),
            title: 'Clinic Visit',
            description: 'General consultation',
            doctor: 'Dr. Smith',
            doctorId: DOCTOR_ID,
            appointmentId: 'apt-1',
            rawData: { status: 'COMPLETED', duration: 30 }
          }
        ],
        summary: {
          totalPrescriptions: 1,
          totalVisits: 1,
          totalRecords: 0,
          lastVisit: new Date('2024-01-20')
        }
      };

      const mockedGetHealthFile = jest.mocked(patientHealthFileService.getPatientUnifiedHealthFile);
        mockedGetHealthFile.mockResolvedValue(mockHealthFile as any);

      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/health-file`)
        .set('x-test-role', Role.PATIENT)
        .set('x-test-user-id', PATIENT_ID);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Patient unified health file fetched');
      expect(res.body.data).toEqual(mockHealthFile);
      expect(mockedGetHealthFile).toHaveBeenCalledWith(PATIENT_ID, {
        userId: PATIENT_ID,
        role: Role.PATIENT
      });
    });

    it('returns unified health file for doctor accessing treated patient', async () => {
      const mockHealthFile = {
        patientId: PATIENT_ID,
        patientName: 'Jane Doe',
        patientMRN: 'MRN-002',
        timeline: [],
        summary: {
          totalPrescriptions: 0,
          totalVisits: 0,
          totalRecords: 0
        }
      };

      const mockedGetHealthFile = jest.mocked(patientHealthFileService.getPatientUnifiedHealthFile);
        mockedGetHealthFile.mockResolvedValue(mockHealthFile as any);

      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/health-file`)
        .set('x-test-role', Role.DOCTOR)
        .set('x-test-user-id', DOCTOR_ID);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.success).toBe(true);
      expect(mockedGetHealthFile).toHaveBeenCalledWith(PATIENT_ID, {
        userId: DOCTOR_ID,
        role: Role.DOCTOR
      });
    });

    it('returns unified health file for admin accessing any patient', async () => {
      const mockHealthFile = {
        patientId: PATIENT_ID,
        patientName: 'Admin View Patient',
        patientMRN: 'MRN-003',
        timeline: [],
        summary: {
          totalPrescriptions: 0,
          totalVisits: 0,
          totalRecords: 0
        }
      };

      const mockedGetHealthFile = jest.mocked(patientHealthFileService.getPatientUnifiedHealthFile);
        mockedGetHealthFile.mockResolvedValue(mockHealthFile as any);

      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/health-file`)
        .set('x-test-role', Role.ADMIN)
        .set('x-test-user-id', ADMIN_ID);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.success).toBe(true);
      expect(mockedGetHealthFile).toHaveBeenCalledWith(PATIENT_ID, {
        userId: ADMIN_ID,
        role: Role.ADMIN
      });
    });

    it('returns 400 for invalid patient ID format', async () => {
      const res = await request(app)
        .get('/api/v1/patients/invalid-id/health-file')
        .set('x-test-role', Role.PATIENT)
        .set('x-test-user-id', PATIENT_ID);

      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/patients/:patientId/timeline/search', () => {
    it('searches timeline with date filter', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      const mockResults = [
        {
          id: 'rx-1',
          type: 'PRESCRIPTION' as const,
          date: new Date('2024-01-20'),
          title: 'Prescription',
          description: 'Ibuprofen 400mg'
        }
      ];

      const mockedSearch = jest.mocked(patientHealthFileService.searchPatientTimeline);
        mockedSearch.mockResolvedValue(mockResults as any);

      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/timeline/search`)
        .query({ dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() })
        .set('x-test-role', Role.PATIENT)
        .set('x-test-user-id', PATIENT_ID);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Timeline searched');
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.results).toEqual(mockResults);
      expect(mockedSearch).toHaveBeenCalledWith(
        PATIENT_ID,
        {
          userId: PATIENT_ID,
          role: Role.PATIENT
        },
        {
          dateFrom,
          dateTo,
          condition: undefined,
          doctor: undefined
        }
      );
    });

    it('searches timeline with condition keyword filter', async () => {
      const mockResults = [
        {
          id: 'rec-1',
          type: 'MEDICAL_RECORD' as const,
          date: new Date('2024-01-20'),
          title: 'Medical Record',
          description: 'Diabetes management',
          diagnosis: 'Type 2 Diabetes'
        }
      ];

      const mockedSearch = jest.mocked(patientHealthFileService.searchPatientTimeline);
        mockedSearch.mockResolvedValue(mockResults as any);

      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/timeline/search`)
        .query({ condition: 'Diabetes' })
        .set('x-test-role', Role.PATIENT)
        .set('x-test-user-id', PATIENT_ID);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.data.count).toBe(1);
      expect(mockedSearch).toHaveBeenCalledWith(
        PATIENT_ID,
        {
          userId: PATIENT_ID,
          role: Role.PATIENT
        },
        expect.objectContaining({
          condition: 'Diabetes'
        })
      );
    });

    it('searches timeline with doctor filter', async () => {
      const mockResults = [
        {
          id: 'rx-2',
          type: 'PRESCRIPTION' as const,
          date: new Date('2024-01-15'),
          title: 'Prescription',
          doctor: 'Dr. Johnson',
          doctorId: DOCTOR_ID
        }
      ];

      const mockedSearch = jest.mocked(patientHealthFileService.searchPatientTimeline);
        mockedSearch.mockResolvedValue(mockResults as any);

      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/timeline/search`)
        .query({ doctor: 'Dr. Johnson' })
        .set('x-test-role', Role.PATIENT)
        .set('x-test-user-id', PATIENT_ID);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.data.results).toHaveLength(1);
      expect(mockedSearch).toHaveBeenCalledWith(
        PATIENT_ID,
        {
          userId: PATIENT_ID,
          role: Role.PATIENT
        },
        expect.objectContaining({
          doctor: 'Dr. Johnson'
        })
      );
    });

    it('returns empty results for no matching records', async () => {
      const mockedSearch = jest.mocked(patientHealthFileService.searchPatientTimeline);
      mockedSearch.mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/timeline/search`)
        .query({ condition: 'NonexistentCondition' })
        .set('x-test-role', Role.PATIENT)
        .set('x-test-user-id', PATIENT_ID);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.data.count).toBe(0);
      expect(res.body.data.results).toEqual([]);
    });

    it('returns 400 for invalid date format', async () => {
      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/timeline/search`)
        .query({ dateFrom: 'invalid-date' })
        .set('x-test-role', Role.PATIENT)
        .set('x-test-user-id', PATIENT_ID);

      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/patients/:patientId/records/:recordId/pdf', () => {
    it('downloads medical record PDF for authorized patient', async () => {
      const mockPdfBuffer = Buffer.from('PDF content here');

      const mockedGeneratePdf = jest.mocked(patientHealthFileService.generateMedicalRecordPdf);
      mockedGeneratePdf.mockResolvedValue(mockPdfBuffer);

      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/records/${RECORD_ID}/pdf`)
        .set('x-test-role', Role.PATIENT)
        .set('x-test-user-id', PATIENT_ID);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/^attachment; filename="/);
      expect(res.body).toEqual(mockPdfBuffer);
      expect(mockedGeneratePdf).toHaveBeenCalledWith(
        RECORD_ID,
        PATIENT_ID,
        {
          userId: PATIENT_ID,
          role: Role.PATIENT
        }
      );
    });

    it('downloads medical record PDF for authorized doctor', async () => {
      const mockPdfBuffer = Buffer.from('PDF content');

      const mockedGeneratePdf = jest.mocked(patientHealthFileService.generateMedicalRecordPdf);
      mockedGeneratePdf.mockResolvedValue(mockPdfBuffer);

      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/records/${RECORD_ID}/pdf`)
        .set('x-test-role', Role.DOCTOR)
        .set('x-test-user-id', DOCTOR_ID);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(mockedGeneratePdf).toHaveBeenCalledWith(
        RECORD_ID,
        PATIENT_ID,
        {
          userId: DOCTOR_ID,
          role: Role.DOCTOR
        }
      );
    });

    it('downloads medical record PDF for admin', async () => {
      const mockPdfBuffer = Buffer.from('PDF');

      const mockedGeneratePdf = jest.mocked(patientHealthFileService.generateMedicalRecordPdf);
      mockedGeneratePdf.mockResolvedValue(mockPdfBuffer);

      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/records/${RECORD_ID}/pdf`)
        .set('x-test-role', Role.ADMIN)
        .set('x-test-user-id', ADMIN_ID);

      expect(res.status).toBe(StatusCodes.OK);
      expect(mockedGeneratePdf).toHaveBeenCalledWith(
        RECORD_ID,
        PATIENT_ID,
        {
          userId: ADMIN_ID,
          role: Role.ADMIN
        }
      );
    });

    it('returns 400 for invalid patient ID format', async () => {
      const res = await request(app)
        .get(`/api/v1/patients/invalid-id/records/${RECORD_ID}/pdf`)
        .set('x-test-role', Role.PATIENT)
        .set('x-test-user-id', PATIENT_ID);

      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid record ID format', async () => {
      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/records/invalid-record-id/pdf`)
        .set('x-test-role', Role.PATIENT)
        .set('x-test-user-id', PATIENT_ID);

      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
      expect(res.body.success).toBe(false);
    });

    it('sets correct PDF filename in content-disposition header', async () => {
      const mockPdfBuffer = Buffer.from('PDF');

      const mockedGeneratePdf = jest.mocked(patientHealthFileService.generateMedicalRecordPdf);
      mockedGeneratePdf.mockResolvedValue(mockPdfBuffer);

      const res = await request(app)
        .get(`/api/v1/patients/${PATIENT_ID}/records/${RECORD_ID}/pdf`)
        .set('x-test-role', Role.PATIENT)
        .set('x-test-user-id', PATIENT_ID);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.headers['content-disposition']).toContain(`${RECORD_ID}.pdf`);
    });
  });
});
