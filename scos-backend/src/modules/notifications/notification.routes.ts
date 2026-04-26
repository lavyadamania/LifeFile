import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/apiResponse';

const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get(
  '/',
  authorizeRoles(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const notifications = await prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(ok('Notifications fetched', notifications));
  })
);

notificationRouter.patch(
  '/:id/read',
  authorizeRoles(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.CLINIC_STAFF),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const notification = await prisma.notification.updateMany({
      where: {
        id: String(req.params.id),
        userId: user.userId
      },
      data: { isRead: true }
    });

    res.json(ok('Notification marked as read', notification));
  })
);

export { notificationRouter };
