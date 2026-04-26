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
    },
    authorizeRoles:
      (...roles: Role[]) =>
      (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
          resForbidden(next);
          return;
        }

        next();
      }
  };
});

jest.mock('../modules/queue/queue.service', () => ({
  getQueueStatus: jest.fn(),
  callNextPatient: jest.fn(),
  updateDoctorDelay: jest.fn()
}));

import { createApp } from '../app';
import * as queueService from '../modules/queue/queue.service';
import { ApiError } from '../utils/ApiError';

const CLINIC_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';

function resForbidden(next: NextFunction): void {
  next(new ApiError(StatusCodes.FORBIDDEN, 'Forbidden'));
}

describe('Queue routes', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches queue status for a clinic+doctor context', async () => {
    const mockedGetQueueStatus = jest.mocked(queueService.getQueueStatus);
    mockedGetQueueStatus.mockResolvedValue({
      status: 'ACTIVE',
      totalWaiting: 1,
      currentToken: null,
      nextToken: { id: 'token-1' },
      estimatedWaitMins: 10
    } as Awaited<ReturnType<typeof queueService.getQueueStatus>>);

    const res = await request(app)
      .get(`/api/v1/queue/${CLINIC_ID}/${DOCTOR_ID}`)
      .set('x-test-role', Role.PATIENT);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Queue status fetched');
    expect(mockedGetQueueStatus).toHaveBeenCalledWith(CLINIC_ID, DOCTOR_ID);
  });

  it('calls next patient for authorized role', async () => {
    const mockedCallNextPatient = jest.mocked(queueService.callNextPatient);
    mockedCallNextPatient.mockResolvedValue({
      id: 'token-next',
      status: 'CALLED'
    } as Awaited<ReturnType<typeof queueService.callNextPatient>>);

    const res = await request(app)
      .post('/api/v1/queue/next')
      .set('x-test-role', Role.DOCTOR)
      .set('x-test-user-id', 'actor-1')
      .send({
        clinicId: CLINIC_ID,
        doctorId: DOCTOR_ID
      });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Next patient called');
    expect(mockedCallNextPatient).toHaveBeenCalledWith({
      clinicId: CLINIC_ID,
      doctorId: DOCTOR_ID,
      actorUserId: 'actor-1',
      role: Role.DOCTOR
    });
  });

  it('rejects queue delay update for non-staff roles', async () => {
    const res = await request(app)
      .patch('/api/v1/queue/delay')
      .set('x-test-role', Role.PATIENT)
      .send({
        clinicId: CLINIC_ID,
        doctorId: DOCTOR_ID,
        delayMins: 30
      });

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Forbidden');
  });

  it('validates queue delay payload before controller', async () => {
    const res = await request(app)
      .patch('/api/v1/queue/delay')
      .set('x-test-role', Role.DOCTOR)
      .send({
        clinicId: CLINIC_ID,
        doctorId: DOCTOR_ID,
        delayMins: -1
      });

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation error');
  });
});
