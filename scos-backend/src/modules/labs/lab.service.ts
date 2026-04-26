import { Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';

export async function createLabOrder(input: {
  actorUserId: string;
  role: Role;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  medicalRecordId?: string;
  labTestId: string;
}) {
  const allowedRoles: Role[] = [Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF];
  if (!allowedRoles.includes(input.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Unauthorized');
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.labOrder.create({
      data: {
        patientId: input.patientId,
        doctorId: input.doctorId,
        appointmentId: input.appointmentId,
        medicalRecordId: input.medicalRecordId,
        labTestId: input.labTestId
      }
    });

    const patient = await tx.patient.findUniqueOrThrow({ where: { id: input.patientId } });

    await tx.notification.create({
      data: {
        userId: patient.userId,
        type: 'LAB',
        title: 'Lab test ordered',
        message: 'A new lab order has been created for you.'
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'LAB_ORDER_CREATED',
        resourceType: 'LabOrder',
        resourceId: order.id
      }
    });

    return order;
  });
}

export async function uploadLabReport(input: {
  actorUserId: string;
  role: Role;
  labOrderId: string;
  reportUrl: string;
  status: 'DRAFT' | 'FINAL' | 'AMENDED';
}) {
  const allowedRoles: Role[] = [Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF];
  if (!allowedRoles.includes(input.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Unauthorized');
  }

  return prisma.$transaction(async (tx) => {
    const report = await tx.labReport.create({
      data: {
        labOrderId: input.labOrderId,
        uploadedById: input.actorUserId,
        reportUrl: input.reportUrl,
        status: input.status
      }
    });

    const order = await tx.labOrder.findUniqueOrThrow({ where: { id: input.labOrderId } });
    const patient = await tx.patient.findUniqueOrThrow({ where: { id: order.patientId } });

    await tx.notification.create({
      data: {
        userId: patient.userId,
        type: 'LAB',
        title: 'Lab report uploaded',
        message: 'Your lab report is now available.'
      }
    });

    if (order.medicalRecordId) {
      await tx.attachment.create({
        data: {
          uploadedById: input.actorUserId,
          fileName: 'lab-report.pdf',
          mimeType: 'application/pdf',
          fileUrl: input.reportUrl,
          fileSizeBytes: 0,
          medicalRecordId: order.medicalRecordId,
          labReportId: report.id
        }
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'LAB_REPORT_UPLOADED',
        resourceType: 'LabReport',
        resourceId: report.id
      }
    });

    return report;
  });
}

export async function updateLabOrderStatus(input: {
  actorUserId: string;
  role: Role;
  orderId: string;
  status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
}) {
  const allowedRoles: Role[] = [Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF];
  if (!allowedRoles.includes(input.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Unauthorized');
  }

  const updated = await prisma.labOrder.update({
    where: { id: input.orderId },
    data: { status: input.status }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: 'LAB_ORDER_STATUS_UPDATED',
      resourceType: 'LabOrder',
      resourceId: updated.id,
      metadata: { status: input.status }
    }
  });

  return updated;
}
