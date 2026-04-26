import { Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

export type TimelineEvent = {
  id: string;
  type: 'PRESCRIPTION' | 'VISIT' | 'MEDICAL_RECORD';
  date: Date;
  title: string;
  description: string;
  doctor?: string;
  doctorId: string;
  appointmentId?: string;
  consultationId?: string;
  medicalRecordId?: string;
  prescriptionId?: string;
  rawData: any;
};

export type UnifiedHealthFile = {
  patientId: string;
  patientName: string;
  patientMRN: string;
  patientDOB?: Date;
  patientGender?: string;
  timeline: TimelineEvent[];
  summary: {
    totalPrescriptions: number;
    totalVisits: number;
    totalRecords: number;
    lastVisit?: Date;
  };
};

export async function getPatientUnifiedHealthFile(input: {
  actorUserId: string;
  role: Role;
  patientId: string;
}): Promise<UnifiedHealthFile> {
  // Authorization check
  if (input.role === Role.PATIENT) {
    const patient = await prisma.patient.findUnique({
      where: { id: input.patientId },
      include: { user: true }
    });
    if (!patient || patient.userId !== input.actorUserId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied to this patient record');
    }
  } else if (input.role === Role.DOCTOR) {
    // Doctor can see patients they've treated
    const doctorRecord = await prisma.doctor.findUnique({
      where: { userId: input.actorUserId }
    });
    if (!doctorRecord) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Doctor profile not found');
    }

    const hasAccess = await prisma.medicalRecord.findFirst({
      where: {
        patientId: input.patientId,
        doctorId: doctorRecord.id
      }
    });

    if (!hasAccess) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'No records found for this patient');
    }
  } else if (input.role !== Role.ADMIN) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Unauthorized role');
  }

  // Fetch patient info
  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
    include: { profile: true }
  });

  if (!patient) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Patient not found');
  }

  // Fetch all prescriptions
  const prescriptions = await prisma.prescription.findMany({
    where: { patientId: input.patientId },
    include: {
      doctor: { include: { profile: true, user: true } },
      items: true,
      versions: { select: { version: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch all appointments/visits
  const appointments = await prisma.appointment.findMany({
    where: {
      patientId: input.patientId,
      status: { in: ['COMPLETED', 'IN_CONSULTATION', 'CHECKED_IN'] }
    },
    include: {
      doctor: { include: { profile: true, user: true } },
      consultationLogs: {
        include: {
          medicalRecords: true
        }
      }
    },
    orderBy: { startsAt: 'desc' }
  });

  // Fetch all medical records
  const medicalRecords = await prisma.medicalRecord.findMany({
    where: { patientId: input.patientId },
    include: {
      doctor: { include: { profile: true, user: true } },
      appointment: true,
      consultationLog: true,
      prescriptions: true,
      attachments: true
    },
    orderBy: { recordDate: 'desc' }
  });

  // Build timeline
  const timelineEvents: TimelineEvent[] = [];

  // Add prescriptions to timeline
  prescriptions.forEach((rx: (typeof prescriptions)[number]) => {
    timelineEvents.push({
      id: rx.id,
      type: 'PRESCRIPTION',
      date: rx.createdAt,
      title: 'Prescription',
      description:
        rx.contentText?.substring(0, 100) ?? `${rx.items.length} medicine items prescribed`,
      doctor: rx.doctor.profile?.fullName ?? rx.doctor.user?.email,
      doctorId: rx.doctorId,
      appointmentId: rx.appointmentId ?? undefined,
      consultationId: rx.consultationLogId ?? undefined,
      prescriptionId: rx.id,
      rawData: {
        contentText: rx.contentText,
        itemCount: rx.items.length,
        currentVersion: rx.currentVersion,
        latestVersionCount: rx.versions.length
      }
    });
  });

  // Add medical records to timeline
  medicalRecords.forEach((record: (typeof medicalRecords)[number]) => {
    timelineEvents.push({
      id: record.id,
      type: 'MEDICAL_RECORD',
      date: record.recordDate,
      title: record.conditionTag ?? 'Medical Record',
      description: record.diagnosis ?? record.symptoms ?? 'Clinical consultation',
      doctor: record.doctor.profile?.fullName ?? record.doctor.user?.email,
      doctorId: record.doctorId,
      appointmentId: record.appointmentId ?? undefined,
      consultationId: record.consultationLogId ?? undefined,
      medicalRecordId: record.id,
      rawData: {
        diagnosis: record.diagnosis,
        symptoms: record.symptoms,
        notes: record.notes,
        followUp: record.followUpInstructions,
        attachmentCount: record.attachments.length
      }
    });
  });

  // Add visits/appointments to timeline
  appointments.forEach((apt: (typeof appointments)[number]) => {
    timelineEvents.push({
      id: apt.id,
      type: 'VISIT',
      date: apt.startsAt,
      title: `Visit - ${apt.status}`,
      description: apt.reason ?? 'Clinic visit',
      doctor: apt.doctor.profile?.fullName ?? apt.doctor.user?.email,
      doctorId: apt.doctorId,
      appointmentId: apt.id,
      rawData: {
        reason: apt.reason,
        status: apt.status,
        consultationCount: apt.consultationLogs.length,
        duration: apt.endsAt
          ? Math.round((apt.endsAt.getTime() - apt.startsAt.getTime()) / 60000)
          : null
      }
    });
  });

  // Sort timeline by date (descending)
  timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    patientId: patient.id,
    patientName: patient.profile?.fullName ?? 'Unknown',
    patientMRN: patient.mrn,
    patientDOB: patient.profile?.dateOfBirth,
    patientGender: patient.profile?.gender ?? undefined,
    timeline: timelineEvents,
    summary: {
      totalPrescriptions: prescriptions.length,
      totalVisits: appointments.length,
      totalRecords: medicalRecords.length,
      lastVisit: appointments.length > 0 ? appointments[0].startsAt : undefined
    }
  };
}

export async function generateMedicalRecordPdf(input: {
  actorUserId: string;
  role: Role;
  patientId: string;
  recordId: string;
}): Promise<Buffer> {
  const { generateMedicalRecordPdf: generatePdf } = await import('./medical-record-pdf.service');

  // Fetch medical record
  const record = await prisma.medicalRecord.findUnique({
    where: { id: input.recordId },
    include: {
      patient: { include: { profile: true } },
      doctor: { include: { profile: true, user: true } },
      appointment: true,
      consultationLog: true,
      prescriptions: true,
      attachments: true
    }
  });

  if (!record) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Medical record not found');
  }

  // Authorization check
  if (input.patientId !== record.patientId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Record does not belong to patient');
  }

  if (input.role === Role.PATIENT) {
    const patient = await prisma.patient.findUnique({
      where: { id: input.patientId },
      include: { user: true }
    });
    if (!patient || patient.userId !== input.actorUserId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
    }
  } else if (input.role === Role.DOCTOR) {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: input.actorUserId }
    });
    if (!doctor || doctor.id !== record.doctorId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Only treating doctor can access');
    }
  } else if (input.role !== Role.ADMIN) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Unauthorized');
  }

  // Generate PDF
  const pdfBuffer = await generatePdf({
    recordId: record.id,
    patientName: record.patient.profile?.fullName ?? 'Unknown',
    patientMRN: record.patient.mrn,
    patientAge: record.patient.profile?.dateOfBirth
      ? Math.floor(
          (new Date().getTime() - new Date(record.patient.profile.dateOfBirth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : undefined,
    patientGender: record.patient.profile?.gender ?? undefined,
    doctorName: record.doctor.profile?.fullName ?? record.doctor.user.email,
    doctorLicense: record.doctor.licenseNumber,
    recordDate: record.recordDate,
    diagnosis: record.diagnosis ?? undefined,
    symptoms: record.symptoms ?? undefined,
    notes: record.notes ?? undefined,
    followUp: record.followUpInstructions ?? undefined,
    prescriptionCount: record.prescriptions.length
  });

  // Log access
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: 'MEDICAL_RECORD_PDF_DOWNLOADED',
      resourceType: 'MedicalRecord',
      resourceId: input.recordId
    }
  });

  return pdfBuffer;
}

export async function searchPatientTimeline(input: {
  actorUserId: string;
  role: Role;
  patientId: string;
  condition?: string;
  dateFrom?: Date;
  dateTo?: Date;
  doctor?: string;
}): Promise<TimelineEvent[]> {
  const healthFile = await getPatientUnifiedHealthFile({
    actorUserId: input.actorUserId,
    role: input.role,
    patientId: input.patientId
  });

  let filtered = healthFile.timeline;

  // Filter by date range
  if (input.dateFrom) {
    filtered = filtered.filter((e) => e.date >= input.dateFrom!);
  }
  if (input.dateTo) {
    filtered = filtered.filter((e) => e.date <= input.dateTo!);
  }

  // Filter by condition/tag
  if (input.condition) {
    filtered = filtered.filter(
      (e) =>
        e.title.toLowerCase().includes(input.condition!.toLowerCase()) ||
        e.description.toLowerCase().includes(input.condition!.toLowerCase()) ||
        e.rawData.diagnosis?.toLowerCase().includes(input.condition!.toLowerCase())
    );
  }

  // Filter by doctor
  if (input.doctor) {
    filtered = filtered.filter(
      (e) =>
        e.doctor?.toLowerCase().includes(input.doctor!.toLowerCase()) ||
        e.doctorId === input.doctor
    );
  }

  return filtered;
}
