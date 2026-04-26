import { QueueState, QueueTokenStatus, Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import dayjs from 'dayjs';
import { prisma } from '../../config/prisma';
import { getSocketServer } from '../../config/socket';
import { ApiError } from '../../utils/ApiError';
import { FIFOQueue } from './fifoQueue';
import { PriorityQueue } from './priorityQueue';

function queueDateKey(date = new Date()): Date {
  return dayjs(date).startOf('day').toDate();
}

function queueRoom(clinicId: string, doctorId: string): string {
  return `queue:${clinicId}:${doctorId}`;
}

async function getOrCreateLiveQueue(clinicId: string, doctorId: string) {
  const queueDate = queueDateKey();

  const existing = await prisma.liveQueue.findUnique({
    where: {
      clinicId_doctorId_queueDate: {
        clinicId,
        doctorId,
        queueDate
      }
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.liveQueue.create({
    data: {
      clinicId,
      doctorId,
      queueDate,
      status: QueueState.ACTIVE
    }
  });
}

async function emitQueue(clinicId: string, doctorId: string) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  const payload = await getQueueStatus(clinicId, doctorId);
  io.to(queueRoom(clinicId, doctorId)).emit('queue:update', payload);
}

async function nextTokenNumber(liveQueueId: string): Promise<number> {
  const latest = await prisma.queueToken.findFirst({
    where: { liveQueueId },
    orderBy: { tokenNumber: 'desc' }
  });

  return (latest?.tokenNumber ?? 0) + 1;
}

export async function upsertQueueTokenForAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) {
    return;
  }

  const liveQueue = await getOrCreateLiveQueue(appointment.clinicId, appointment.doctorId);
  const tokenNumber = await nextTokenNumber(liveQueue.id);

  await prisma.queueToken.create({
    data: {
      liveQueueId: liveQueue.id,
      appointmentId,
      patientId: appointment.patientId,
      tokenNumber,
      priorityScore: appointment.emergencyPriority,
      status: QueueTokenStatus.WAITING
    }
  });

  await emitQueue(appointment.clinicId, appointment.doctorId);
}

export async function upsertQueueTokenForWalkIn(walkInId: string) {
  const walkIn = await prisma.walkIn.findUnique({ where: { id: walkInId } });
  if (!walkIn || !walkIn.doctorId) {
    return;
  }

  const liveQueue = await getOrCreateLiveQueue(walkIn.clinicId, walkIn.doctorId);
  const tokenNumber = await nextTokenNumber(liveQueue.id);

  await prisma.queueToken.create({
    data: {
      liveQueueId: liveQueue.id,
      walkInId,
      patientId: walkIn.patientId,
      tokenNumber,
      priorityScore: walkIn.emergencyPriority,
      status: QueueTokenStatus.WAITING
    }
  });

  await emitQueue(walkIn.clinicId, walkIn.doctorId);
}

export function selectNextTokenId(tokens: Array<{ id: string; priorityScore: number; createdAt: Date }>): string | null {
  const priorityHeap = new PriorityQueue();
  const fifo = new FIFOQueue<{ tokenId: string }>();

  const orderedByArrival = [...tokens].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const token of orderedByArrival) {
    if (token.priorityScore > 0) {
      priorityHeap.push({
        tokenId: token.id,
        priorityScore: token.priorityScore,
        createdAt: token.createdAt.getTime()
      });
      continue;
    }

    fifo.enqueue({ tokenId: token.id });
  }

  const priorityPick = priorityHeap.pop();
  if (priorityPick) {
    return priorityPick.tokenId;
  }

  return fifo.dequeue()?.tokenId ?? null;
}

export async function getQueueStatus(clinicId: string, doctorId: string) {
  const queueDate = queueDateKey();

  const liveQueue = await prisma.liveQueue.findUnique({
    where: {
      clinicId_doctorId_queueDate: {
        clinicId,
        doctorId,
        queueDate
      }
    },
    include: {
      queueTokens: {
        where: {
          status: { in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED] }
        },
        orderBy: [{ priorityScore: 'desc' }, { createdAt: 'asc' }]
      }
    }
  });

  if (!liveQueue) {
    return {
      status: QueueState.CLOSED,
      totalWaiting: 0,
      emergencyWaiting: 0,
      normalWaiting: 0,
      currentToken: null,
      nextToken: null,
      estimatedWaitMins: 0
    };
  }

  const waiting = liveQueue.queueTokens.filter((token) => token.status === QueueTokenStatus.WAITING);
  const current = liveQueue.queueTokens.find((token) => token.status === QueueTokenStatus.CALLED) ?? null;
  const emergencyWaiting = waiting.filter((token) => token.priorityScore > 0).length;
  const normalWaiting = waiting.length - emergencyWaiting;
  const estimatedWaitMins = Math.max(0, waiting.length * 10 + liveQueue.doctorDelayMins);

  return {
    status: liveQueue.status,
    doctorDelayMins: liveQueue.doctorDelayMins,
    totalWaiting: waiting.length,
    emergencyWaiting,
    normalWaiting,
    currentToken: current,
    nextToken: waiting[0] ?? null,
    estimatedWaitMins
  };
}

export async function callNextPatient(input: {
  clinicId: string;
  doctorId: string;
  actorUserId: string;
  role: Role;
}) {
  if (input.role !== Role.DOCTOR && input.role !== Role.ADMIN && input.role !== Role.CLINIC_STAFF) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only clinic staff can manage queue');
  }

  const queueDate = queueDateKey();
  const liveQueue = await prisma.liveQueue.findUnique({
    where: {
      clinicId_doctorId_queueDate: {
        clinicId: input.clinicId,
        doctorId: input.doctorId,
        queueDate
      }
    },
    include: {
      queueTokens: {
        where: { status: QueueTokenStatus.WAITING }
      }
    }
  });

  if (!liveQueue) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Live queue not found for this doctor/clinic/day');
  }

  const nextTokenId = selectNextTokenId(liveQueue.queueTokens);
  if (!nextTokenId) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No waiting patients');
  }

  const called = await prisma.$transaction(async (tx) => {
    await tx.queueToken.updateMany({
      where: {
        liveQueueId: liveQueue.id,
        status: QueueTokenStatus.CALLED
      },
      data: {
        status: QueueTokenStatus.DONE,
        servedAt: new Date()
      }
    });

    const calledToken = await tx.queueToken.update({
      where: { id: nextTokenId },
      data: {
        status: QueueTokenStatus.CALLED
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'QUEUE_CALL_NEXT',
        resourceType: 'QueueToken',
        resourceId: calledToken.id
      }
    });

    return calledToken;
  });

  await emitQueue(input.clinicId, input.doctorId);
  return called;
}

export async function updateDoctorDelay(input: {
  clinicId: string;
  doctorId: string;
  delayMins: number;
  actorUserId: string;
}) {
  const liveQueue = await getOrCreateLiveQueue(input.clinicId, input.doctorId);
  const updated = await prisma.liveQueue.update({
    where: { id: liveQueue.id },
    data: {
      doctorDelayMins: input.delayMins
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: 'QUEUE_DELAY_UPDATED',
      resourceType: 'LiveQueue',
      resourceId: liveQueue.id,
      metadata: { delayMins: input.delayMins }
    }
  });

  await emitQueue(input.clinicId, input.doctorId);
  return updated;
}

export function queueChannel(clinicId: string, doctorId: string): string {
  return queueRoom(clinicId, doctorId);
}
