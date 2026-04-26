import { PermissionScope, Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';

async function getDoctorIdByUser(userId: string): Promise<string | null> {
  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  return doctor?.id ?? null;
}

async function getPatientIdByUser(userId: string): Promise<string | null> {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  return patient?.id ?? null;
}

export async function canDoctorAccessPatientRecords(input: { doctorUserId: string; patientId: string }) {
  const doctor = await prisma.doctor.findUnique({ where: { userId: input.doctorUserId } });
  if (!doctor) {
    return false;
  }

  const now = new Date();
  const permission = await prisma.patientRecordPermission.findFirst({
    where: {
      patientId: input.patientId,
      doctorId: doctor.id,
      isRevoked: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    }
  });

  if (permission) {
    return true;
  }

  const relationship = await prisma.appointment.findFirst({
    where: {
      patientId: input.patientId,
      doctorId: doctor.id
    }
  });

  return Boolean(relationship);
}

export async function createMedicalRecord(input: {
  actorUserId: string;
  role: Role;
  patientId: string;
  appointmentId?: string;
  consultationLogId?: string;
  diagnosis?: string;
  symptoms?: string;
  notes?: string;
  prescriptionSummary?: string;
  followUpInstructions?: string;
  conditionTag?: string;
  recordDate: Date;
}) {
  if (input.role !== Role.DOCTOR && input.role !== Role.ADMIN) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only doctor/admin can create records');
  }

  const doctorId = await getDoctorIdByUser(input.actorUserId);
  if (!doctorId && input.role !== Role.ADMIN) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Doctor profile required');
  }

  return prisma.$transaction(async (tx) => {
    const record = await tx.medicalRecord.create({
      data: {
        patientId: input.patientId,
        doctorId: doctorId ?? (await tx.doctor.findFirstOrThrow()).id,
        appointmentId: input.appointmentId,
        consultationLogId: input.consultationLogId,
        diagnosis: input.diagnosis,
        symptoms: input.symptoms,
        notes: input.notes,
        prescriptionSummary: input.prescriptionSummary,
        followUpInstructions: input.followUpInstructions,
        conditionTag: input.conditionTag,
        recordDate: input.recordDate
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'MEDICAL_RECORD_CREATED',
        resourceType: 'MedicalRecord',
        resourceId: record.id
      }
    });

    return record;
  });
}

export async function getPatientTimeline(input: {
  actorUserId: string;
  role: Role;
  patientId: string;
  from?: string;
  to?: string;
  condition?: string;
  doctorId?: string;
  page: number;
  limit: number;
}) {
  if (input.role === Role.PATIENT) {
    const patientId = await getPatientIdByUser(input.actorUserId);
    if (patientId !== input.patientId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Cannot access other patient records');
    }
  }

  if (input.role === Role.DOCTOR) {
    const allowed = await canDoctorAccessPatientRecords({
      doctorUserId: input.actorUserId,
      patientId: input.patientId
    });
    if (!allowed) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied for patient records');
    }
  }

  const where = {
    patientId: input.patientId,
    deletedAt: null,
    conditionTag: input.condition,
    doctorId: input.doctorId,
    recordDate: {
      gte: input.from ? new Date(input.from) : undefined,
      lte: input.to ? new Date(input.to) : undefined
    }
  };

  const [items, total] = await Promise.all([
    prisma.medicalRecord.findMany({
      where,
      include: {
        doctor: { include: { profile: true } },
        attachments: true,
        prescriptions: {
          include: {
            items: {
              include: {
                medicine: true
              }
            }
          }
        },
        labOrders: {
          include: {
            labTest: true,
            reports: true
          }
        }
      },
      orderBy: { recordDate: 'desc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit
    }),
    prisma.medicalRecord.count({ where })
  ]);

  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: 'MEDICAL_RECORD_TIMELINE_VIEWED',
      resourceType: 'Patient',
      resourceId: input.patientId
    }
  });

  return {
    items,
    total,
    page: input.page,
    limit: input.limit
  };
}

export async function grantRecordAccess(input: {
  actorUserId: string;
  role: Role;
  doctorId: string;
  scope: PermissionScope;
  medicalRecordId?: string;
  accessMethod: 'DIRECT' | 'SHARE_LINK' | 'QR_TOKEN' | 'EMERGENCY_OVERRIDE';
  expiresAt?: Date;
}) {
  if (input.role !== Role.PATIENT) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only patient can grant access');
  }

  const patientId = await getPatientIdByUser(input.actorUserId);
  if (!patientId) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Patient account not found');
  }

  if (input.scope === PermissionScope.SELECTED_RECORDS && !input.medicalRecordId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'medicalRecordId is required for selected record scope');
  }

  const permission = await prisma.patientRecordPermission.create({
    data: {
      patientId,
      doctorId: input.doctorId,
      grantedByUserId: input.actorUserId,
      scope: input.scope,
      medicalRecordId: input.medicalRecordId,
      accessMethod: input.accessMethod,
      expiresAt: input.expiresAt
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: 'RECORD_ACCESS_GRANTED',
      resourceType: 'PatientRecordPermission',
      resourceId: permission.id
    }
  });

  return permission;
}

export async function revokePermission(input: {
  actorUserId: string;
  role: Role;
  permissionId: string;
}) {
  if (input.role !== Role.PATIENT && input.role !== Role.ADMIN) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Unauthorized');
  }

  const patientId = input.role === Role.PATIENT ? await getPatientIdByUser(input.actorUserId) : null;

  const permission = await prisma.patientRecordPermission.findUnique({
    where: { id: input.permissionId }
  });

  if (!permission) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Permission not found');
  }

  if (patientId && permission.patientId !== patientId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Cannot revoke this permission');
  }

  const updated = await prisma.patientRecordPermission.update({
    where: { id: input.permissionId },
    data: {
      isRevoked: true,
      revokedAt: new Date()
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: 'RECORD_ACCESS_REVOKED',
      resourceType: 'PatientRecordPermission',
      resourceId: updated.id
    }
  });

  return updated;
}
