import { Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { generatePrescriptionPdf } from '../../services/pdf.service';
import { storePrescriptionPdf } from '../../services/storage.service';

type ItemInput = {
  medicineId: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
};

async function collectConflicts(patientId: string, items: ItemInput[]) {
  const medicineIds = items.map((i) => i.medicineId);

  const existingMeds = await prisma.prescriptionItem.findMany({
    where: {
      prescription: {
        patientId
      }
    },
    select: { medicineId: true }
  });

  const allMeds = [...new Set([...medicineIds, ...existingMeds.map((m) => m.medicineId)])];

  const conflicts = await prisma.medicineConflict.findMany({
    where: {
      OR: [
        {
          medicineAId: { in: allMeds },
          medicineBId: { in: allMeds }
        },
        {
          medicineAId: { in: allMeds },
          medicineBId: { in: medicineIds }
        }
      ]
    },
    include: {
      medicineA: true,
      medicineB: true
    }
  });

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { profile: true }
  });

  const allergyText = patient?.profile?.allergies?.toLowerCase() ?? '';
  const allergyWarnings = await prisma.medicineCatalog.findMany({
    where: {
      id: { in: medicineIds }
    }
  });

  const allergyMatches = allergyWarnings
    .filter((m) => allergyText.includes(m.name.toLowerCase()) || allergyText.includes((m.genericName ?? '').toLowerCase()))
    .map((m) => `Patient allergy may conflict with ${m.name}`);

  return {
    conflicts: conflicts.map((c) => ({
      medicineA: c.medicineA.name,
      medicineB: c.medicineB.name,
      severity: c.severity,
      warning: c.warning
    })),
    allergyMatches
  };
}

export async function createPrescription(input: {
  actorUserId: string;
  role: Role;
  patientId: string;
  appointmentId?: string;
  consultationLogId?: string;
  medicalRecordId?: string;
  instructions?: string;
  items: ItemInput[];
}) {
  const allowedRoles: Role[] = [Role.DOCTOR, Role.ADMIN];
  if (!allowedRoles.includes(input.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only doctors/admin can create prescriptions');
  }

  const doctor = await prisma.doctor.findUnique({ where: { userId: input.actorUserId } });
  if (!doctor && input.role !== Role.ADMIN) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Doctor profile required');
  }

  const warnings = await collectConflicts(input.patientId, input.items);

  const prescription = await prisma.$transaction(async (tx) => {
    const created = await tx.prescription.create({
      data: {
        patientId: input.patientId,
        doctorId: doctor?.id ?? (await tx.doctor.findFirstOrThrow()).id,
        appointmentId: input.appointmentId,
        consultationLogId: input.consultationLogId,
        medicalRecordId: input.medicalRecordId,
        instructions: input.instructions,
        items: {
          create: input.items
        }
      },
      include: {
        items: {
          include: {
            medicine: true
          }
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'PRESCRIPTION_CREATED',
        resourceType: 'Prescription',
        resourceId: created.id,
        metadata: warnings
      }
    });

    await tx.notification.create({
      data: {
        userId: (await tx.patient.findUniqueOrThrow({ where: { id: input.patientId } })).userId,
        type: 'PRESCRIPTION',
        title: 'Prescription created',
        message: 'A new prescription is available in your profile.'
      }
    });

    return created;
  });

  return {
    prescription,
    warnings
  };
}

export async function createTypedPrescription(input: {
  actorUserId: string;
  role: Role;
  patientId: string;
  doctorId?: string;
  consultationId?: string;
  medicalRecordId?: string;
  contentText: string;
}) {
  if (input.role !== Role.DOCTOR && input.role !== Role.ADMIN) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only doctors/admin can create typed prescriptions');
  }

  const actorDoctor = await prisma.doctor.findUnique({ where: { userId: input.actorUserId } });
  if (!actorDoctor && input.role !== Role.ADMIN) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Doctor profile required');
  }

  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
    include: { profile: true }
  });
  if (!patient) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Patient not found');
  }

  const effectiveDoctorId = input.doctorId ?? actorDoctor?.id;
  if (!effectiveDoctorId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'doctorId is required for admin-issued typed prescriptions');
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: effectiveDoctorId },
    include: { profile: true, user: true, specialization: true }
  });
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor not found');
  }

  if (input.consultationId) {
    const consultation = await prisma.consultationLog.findUnique({ where: { id: input.consultationId } });
    if (!consultation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Consultation not found');
    }

    if (consultation.patientId !== input.patientId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Consultation does not belong to this patient');
    }

    if (consultation.doctorId !== effectiveDoctorId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Consultation does not belong to the selected doctor');
    }
  }

  const created = await prisma.prescription.create({
    data: {
      patientId: input.patientId,
      doctorId: effectiveDoctorId,
      consultationLogId: input.consultationId,
      medicalRecordId: input.medicalRecordId,
      contentText: input.contentText,
      instructions: null,
      currentVersion: 1
    }
  });

  // Calculate patient age
  const patientAge = patient.profile?.dateOfBirth
    ? Math.floor(
        (new Date().getTime() - new Date(patient.profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      )
    : undefined;

  const pdfBuffer = await generatePrescriptionPdf({
    prescriptionId: created.id,
    patientId: input.patientId,
    patientName: patient.profile?.fullName ?? 'Unknown',
    patientMRN: patient.mrn,
    patientAge,
    patientGender: patient.profile?.gender ?? undefined,
    doctorId: effectiveDoctorId,
    doctorName: doctor.profile?.fullName ?? doctor.user.email,
    doctorLicense: doctor.licenseNumber,
    doctorSpecialization: doctor.specialization?.name,
    consultationId: input.consultationId,
    contentText: input.contentText,
    issuedAt: created.createdAt,
    version: 1
  });

  const stored = await storePrescriptionPdf({
    prescriptionId: created.id,
    patientId: input.patientId,
    content: pdfBuffer
  });

  const attachment = await prisma.$transaction(async (tx) => {
    const docAttachment = await tx.attachment.create({
      data: {
        uploadedById: input.actorUserId,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        fileUrl: stored.fileUrl,
        fileSizeBytes: stored.fileSizeBytes,
        medicalRecordId: input.medicalRecordId,
        prescriptionId: created.id
      }
    });

    // Create version 1 record
    await tx.prescriptionVersion.create({
      data: {
        prescriptionId: created.id,
        version: 1,
        contentText: input.contentText,
        pdfAttachmentId: docAttachment.id,
        updatedBy: input.actorUserId
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'TYPED_PRESCRIPTION_CREATED',
        resourceType: 'Prescription',
        resourceId: created.id,
        metadata: { version: 1 }
      }
    });

    await tx.notification.create({
      data: {
        userId: patient.userId,
        type: 'PRESCRIPTION',
        title: 'Typed prescription created',
        message: 'A typed prescription PDF is available in your profile.'
      }
    });

    return docAttachment;
  });

  return {
    prescription: {
      id: created.id,
      patientId: created.patientId,
      doctorId: created.doctorId,
      consultationId: created.consultationLogId,
      contentText: created.contentText,
      currentVersion: 1,
      createdAt: created.createdAt
    },
    pdf: {
      fileUrl: attachment.fileUrl,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSizeBytes: attachment.fileSizeBytes
    }
  };
}

export async function editPrescription(input: {
  actorUserId: string;
  role: Role;
  prescriptionId: string;
  contentText: string;
}) {
  if (input.role !== Role.DOCTOR && input.role !== Role.ADMIN) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only doctors/admin can edit prescriptions');
  }

  const prescription = await prisma.prescription.findUnique({
    where: { id: input.prescriptionId },
    include: {
      patient: { include: { profile: true } },
      doctor: { include: { profile: true, user: true, specialization: true } }
    }
  });

  if (!prescription) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Prescription not found');
  }

  // Verify actor is the doctor who created the prescription
  if (input.role === Role.DOCTOR) {
    const actorDoctor = await prisma.doctor.findUnique({ where: { userId: input.actorUserId } });
    if (!actorDoctor || actorDoctor.id !== prescription.doctorId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You can only edit your own prescriptions');
    }
  }

  // Calculate patient age
  const patientAge = prescription.patient.profile?.dateOfBirth
    ? Math.floor(
        (new Date().getTime() - new Date(prescription.patient.profile.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : undefined;

  const newVersion = prescription.currentVersion + 1;

  const pdfBuffer = await generatePrescriptionPdf({
    prescriptionId: prescription.id,
    patientId: prescription.patientId,
    patientName: prescription.patient.profile?.fullName ?? 'Unknown',
    patientMRN: prescription.patient.mrn,
    patientAge,
    patientGender: prescription.patient.profile?.gender ?? undefined,
    doctorId: prescription.doctorId,
    doctorName: prescription.doctor.profile?.fullName ?? prescription.doctor.user.email,
    doctorLicense: prescription.doctor.licenseNumber,
    doctorSpecialization: prescription.doctor.specialization?.name,
    consultationId: prescription.consultationLogId ?? undefined,
    contentText: input.contentText,
    issuedAt: prescription.createdAt,
    version: newVersion
  });

  const stored = await storePrescriptionPdf({
    prescriptionId: prescription.id,
    patientId: prescription.patientId,
    content: pdfBuffer,
    version: newVersion
  });

  const result = await prisma.$transaction(async (tx) => {
    const newAttachment = await tx.attachment.create({
      data: {
        uploadedById: input.actorUserId,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        fileUrl: stored.fileUrl,
        fileSizeBytes: stored.fileSizeBytes,
        prescriptionId: prescription.id
      }
    });

    // Create new version record
    await tx.prescriptionVersion.create({
      data: {
        prescriptionId: prescription.id,
        version: newVersion,
        contentText: input.contentText,
        pdfAttachmentId: newAttachment.id,
        updatedBy: input.actorUserId
      }
    });

    // Update prescription
    const updated = await tx.prescription.update({
      where: { id: input.prescriptionId },
      data: {
        contentText: input.contentText,
        currentVersion: newVersion,
        updatedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'PRESCRIPTION_EDITED',
        resourceType: 'Prescription',
        resourceId: prescription.id,
        metadata: { previousVersion: prescription.currentVersion, newVersion }
      }
    });

    await tx.notification.create({
      data: {
        userId: prescription.patient.userId,
        type: 'PRESCRIPTION',
        title: 'Prescription updated',
        message: `Your prescription (v${newVersion}) has been updated.`
      }
    });

    return updated;
  });

  return {
    prescription: {
      id: result.id,
      patientId: result.patientId,
      doctorId: result.doctorId,
      consultationId: result.consultationLogId ?? undefined,
      contentText: result.contentText,
      currentVersion: result.currentVersion,
      updatedAt: result.updatedAt
    },
    version: newVersion
  };
}

export async function getPrescriptionVersions(prescriptionId: string) {
  const versions = await prisma.prescriptionVersion.findMany({
    where: { prescriptionId },
    include: {
      pdfAttachment: {
        select: {
          fileUrl: true,
          fileName: true,
          mimeType: true,
          fileSizeBytes: true,
          createdAt: true
        }
      }
    },
    orderBy: { version: 'desc' }
  });

  return versions.map((v) => ({
    version: v.version,
    contentText: v.contentText,
    createdAt: v.createdAt,
    updatedBy: v.updatedBy,
    pdf: v.pdfAttachment
      ? {
          fileUrl: v.pdfAttachment.fileUrl,
          fileName: v.pdfAttachment.fileName,
          mimeType: v.pdfAttachment.mimeType,
          fileSizeBytes: v.pdfAttachment.fileSizeBytes
        }
      : null
  }));
}
