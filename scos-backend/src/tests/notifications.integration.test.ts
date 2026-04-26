import request from 'supertest';
import { NotificationType, Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

jest.mock('../middleware/auth', () => {
  return {
    authenticate: (req: Request, _res: Response, next: NextFunction): void => {
      req.user = {
        userId: String(req.header('x-test-user-id') ?? 'test-user-id'),
        role: (req.header('x-test-role') as Role | undefined) ?? Role.PATIENT
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

jest.mock('../config/prisma', () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      updateMany: jest.fn()
    }
  }
}));

import { createApp } from '../app';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

function resForbidden(next: NextFunction): void {
  next(new ApiError(StatusCodes.FORBIDDEN, 'Forbidden'));
}

describe('Notification routes', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists notifications for authenticated user', async () => {
    const mockedFindMany = jest.mocked(prisma.notification.findMany);
    mockedFindMany.mockResolvedValue([
      {
        id: 'notif-1',
        userId: 'user-123',
        title: 'Queue update',
        message: 'You are next',
        isRead: false,
        type: NotificationType.QUEUE,
        payload: null,
        createdAt: new Date('2026-04-23T00:00:00.000Z'),
      }
    ]);

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('x-test-user-id', 'user-123')
      .set('x-test-role', Role.PATIENT);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Notifications fetched');
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  });

  it('marks a user-owned notification as read', async () => {
    const mockedUpdateMany = jest.mocked(prisma.notification.updateMany);
    mockedUpdateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .patch('/api/v1/notifications/notif-42/read')
      .set('x-test-user-id', 'user-456')
      .set('x-test-role', Role.DOCTOR);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Notification marked as read');
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'notif-42',
        userId: 'user-456'
      },
      data: { isRead: true }
    });
  });

  it('returns forbidden for unsupported role', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('x-test-role', 'VISITOR');

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Forbidden');
  });
});
