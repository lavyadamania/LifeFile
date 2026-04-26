import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import * as prescriptionService from '../modules/prescriptions/prescription.service';
import * as pdfService from '../services/pdf.service';
import * as storageService from '../services/storage.service';

jest.mock('../services/pdf.service');
jest.mock('../services/storage.service');

describe('Stage 8: PDF Generation System with Versioning', () => {
  let patientId: string;
  let doctorUserId: string;
  let doctorId: string;
  let consultationId: string;

  beforeEach(async () => {
    // Create test patient
    const patientUser = await prisma.user.create({
      data: {
        email: `patient-${Date.now()}@test.com`,
        passwordHash: 'hash',
        role: Role.PATIENT
      }
    });

    const patient = await prisma.patient.create({
      data: { userId: patientUser.id, mrn: `MRN-${Date.now()}` }
    });

    await prisma.patientProfile.create({
      data: {
        patientId: patient.id,
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'M'
      }
    });

    patientId = patient.id;

    // Create test doctor
    const doctorUser = await prisma.user.create({
      data: {
        email: `doctor-${Date.now()}@test.com`,
        passwordHash: 'hash',
        role: Role.DOCTOR
      }
    });

    const doctor = await prisma.doctor.create({
      data: { userId: doctorUser.id, licenseNumber: `LIC-${Date.now()}` }
    });

    await prisma.doctorProfile.create({
      data: {
        doctorId: doctor.id,
        fullName: 'Dr. Smith',
        experienceYears: 5,
        qualifications: 'MBBS'
      }
    });

    doctorUserId = doctorUser.id;
    doctorId = doctor.id;

    // Create consultation
    const consultation = await prisma.consultationLog.create({
      data: {
        patientId,
        doctorId,
        startedAt: new Date()
      }
    });

    consultationId = consultation.id;

    // Mock services
    (pdfService.generatePrescriptionPdf as jest.Mock).mockResolvedValue(Buffer.from('pdf-content'));
    (storageService.storePrescriptionPdf as jest.Mock).mockResolvedValue({
      fileName: 'rx.pdf',
      fileUrl: 'http://localhost:3000/prescriptions/rx.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024
    });
  });

  describe('PDF Generation with Complete Details', () => {
    test('should generate PDF on prescription creation with all required details', async () => {
      const result = await prescriptionService.createTypedPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        patientId,
        consultationId,
        contentText: 'Take medication as prescribed'
      });

      // Verify PDF generated with full details
      expect(pdfService.generatePrescriptionPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          prescriptionId: expect.any(String),
          patientName: 'John Doe',
          patientMRN: expect.any(String),
          patientAge: expect.any(Number),
          patientGender: 'M',
          doctorName: 'Dr. Smith',
          doctorLicense: expect.any(String),
          contentText: 'Take medication as prescribed',
          issuedAt: expect.any(Date),
          version: 1
        })
      );

      // Verify pdf_url stored
      expect(result.pdf.fileUrl).toContain('prescriptions');
      expect(result.prescription.currentVersion).toBe(1);
    });

    test('should store pdf_url in Attachment model', async () => {
      const result = await prescriptionService.createTypedPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        patientId,
        contentText: 'Rx content'
      });

      const attachment = await prisma.attachment.findFirst({
        where: { prescriptionId: result.prescription.id }
      });

      expect(attachment?.fileUrl).toBe(result.pdf.fileUrl);
      expect(attachment?.mimeType).toBe('application/pdf');
    });
  });

  describe('Prescription Versioning', () => {
    test('should increment version on edit and regenerate PDF', async () => {
      const created = await prescriptionService.createTypedPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        patientId,
        contentText: 'Original content'
      });

      jest.clearAllMocks();
      (pdfService.generatePrescriptionPdf as jest.Mock).mockResolvedValue(Buffer.from('pdf-v2'));
      (storageService.storePrescriptionPdf as jest.Mock).mockResolvedValue({
        fileName: 'rx-v2.pdf',
        fileUrl: 'http://localhost:3000/prescriptions/rx-v2.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048
      });

      const edited = await prescriptionService.editPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        prescriptionId: created.prescription.id,
        contentText: 'Updated content'
      });

      expect(edited.version).toBe(2);
      expect(pdfService.generatePrescriptionPdf).toHaveBeenCalledWith(
        expect.objectContaining({ version: 2, contentText: 'Updated content' })
      );

      const updated = await prisma.prescription.findUnique({
        where: { id: created.prescription.id }
      });
      expect(updated?.currentVersion).toBe(2);
    });

    test('should maintain all versions in PrescriptionVersion table', async () => {
      const created = await prescriptionService.createTypedPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        patientId,
        contentText: 'v1'
      });

      // Edit to create v2 and v3
      for (let i = 2; i <= 3; i++) {
        jest.clearAllMocks();
        (pdfService.generatePrescriptionPdf as jest.Mock).mockResolvedValue(Buffer.from(`v${i}`));
        (storageService.storePrescriptionPdf as jest.Mock).mockResolvedValue({
          fileName: `rx-v${i}.pdf`,
          fileUrl: `http://localhost:3000/prescriptions/rx-v${i}.pdf`,
          mimeType: 'application/pdf',
          fileSizeBytes: 1024 * i
        });

        await prescriptionService.editPrescription({
          actorUserId: doctorUserId,
          role: Role.DOCTOR,
          prescriptionId: created.prescription.id,
          contentText: `v${i}`
        });
      }

      const versions = await prescriptionService.getPrescriptionVersions(created.prescription.id);

      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe(3);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(1);
      expect(versions.map((v) => v.contentText)).toEqual(['v3', 'v2', 'v1']);
    });

    test('should retrieve versions with PDF metadata', async () => {
      const created = await prescriptionService.createTypedPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        patientId,
        contentText: 'Initial'
      });

      jest.clearAllMocks();
      (pdfService.generatePrescriptionPdf as jest.Mock).mockResolvedValue(Buffer.from('v2'));
      (storageService.storePrescriptionPdf as jest.Mock).mockResolvedValue({
        fileName: 'rx-v2.pdf',
        fileUrl: 'http://localhost:3000/rx-v2.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048
      });

      await prescriptionService.editPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        prescriptionId: created.prescription.id,
        contentText: 'Updated'
      });

      const versions = await prescriptionService.getPrescriptionVersions(created.prescription.id);

      expect(versions[0]).toMatchObject({
        version: 2,
        contentText: 'Updated',
        createdAt: expect.any(Date),
        updatedBy: doctorUserId,
        pdf: expect.objectContaining({
          fileUrl: expect.stringContaining('rx-v2.pdf'),
          mimeType: 'application/pdf'
        })
      });
    });
  });

  describe('Audit Trail', () => {
    test('should log creation with version', async () => {
      const result = await prescriptionService.createTypedPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        patientId,
        contentText: 'Rx'
      });

      const audit = await prisma.auditLog.findFirst({
        where: { resourceId: result.prescription.id, action: 'TYPED_PRESCRIPTION_CREATED' }
      });

      expect(audit?.metadata).toEqual({ version: 1 });
    });

    test('should log edits with version tracking', async () => {
      const created = await prescriptionService.createTypedPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        patientId,
        contentText: 'v1'
      });

      jest.clearAllMocks();
      (pdfService.generatePrescriptionPdf as jest.Mock).mockResolvedValue(Buffer.from('v2'));
      (storageService.storePrescriptionPdf as jest.Mock).mockResolvedValue({
        fileName: 'rx-v2.pdf',
        fileUrl: 'http://localhost:3000/rx-v2.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048
      });

      await prescriptionService.editPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        prescriptionId: created.prescription.id,
        contentText: 'v2'
      });

      const audit = await prisma.auditLog.findFirst({
        where: { resourceId: created.prescription.id, action: 'PRESCRIPTION_EDITED' }
      });

      expect(audit?.metadata).toEqual({ previousVersion: 1, newVersion: 2 });
    });
  });

  describe('Authorization', () => {
    test('should forbid patient from editing', async () => {
      const created = await prescriptionService.createTypedPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        patientId,
        contentText: 'Rx'
      });

      const patientUser = await prisma.user.findUnique({
        where: { id: (await prisma.patient.findUnique({ where: { id: patientId } }))!.userId }
      });

      await expect(
        prescriptionService.editPrescription({
          actorUserId: patientUser!.id,
          role: Role.PATIENT,
          prescriptionId: created.prescription.id,
          contentText: 'Updated'
        })
      ).rejects.toThrow('Only doctors/admin can edit prescriptions');
    });

    test('should allow doctor to edit own prescriptions', async () => {
      const created = await prescriptionService.createTypedPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        patientId,
        contentText: 'Rx'
      });

      jest.clearAllMocks();
      (pdfService.generatePrescriptionPdf as jest.Mock).mockResolvedValue(Buffer.from('v2'));
      (storageService.storePrescriptionPdf as jest.Mock).mockResolvedValue({
        fileName: 'rx-v2.pdf',
        fileUrl: 'http://localhost:3000/rx-v2.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048
      });

      const result = await prescriptionService.editPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        prescriptionId: created.prescription.id,
        contentText: 'Updated'
      });

      expect(result.version).toBe(2);
    });

    test('should allow admin to edit any prescription', async () => {
      const created = await prescriptionService.createTypedPrescription({
        actorUserId: doctorUserId,
        role: Role.DOCTOR,
        patientId,
        contentText: 'Rx'
      });

      const admin = await prisma.user.create({
        data: {
          email: `admin-${Date.now()}@test.com`,
          passwordHash: 'hash',
          role: Role.ADMIN
        }
      });

      jest.clearAllMocks();
      (pdfService.generatePrescriptionPdf as jest.Mock).mockResolvedValue(Buffer.from('v2'));
      (storageService.storePrescriptionPdf as jest.Mock).mockResolvedValue({
        fileName: 'rx-v2.pdf',
        fileUrl: 'http://localhost:3000/rx-v2.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048
      });

      const result = await prescriptionService.editPrescription({
        actorUserId: admin.id,
        role: Role.ADMIN,
        prescriptionId: created.prescription.id,
        contentText: 'Admin edit'
      });

      expect(result.version).toBe(2);
    });
  });
});
