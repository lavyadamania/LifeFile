import { Router } from 'express';
import { healthRouter } from './health.route';
import { authRouter } from '../modules/auth/auth.routes';
import { profileRouter } from '../modules/users/profile.routes';
import { appointmentRouter } from '../modules/appointments/appointment.routes';
import { queueRouter } from '../modules/queue/queue.routes';
import { recordRouter } from '../modules/records/record.routes';
import { prescriptionRouter } from '../modules/prescriptions/prescription.routes';
import { labRouter } from '../modules/labs/lab.routes';
import { reviewRouter } from '../modules/reviews/review.routes';
import { notificationRouter } from '../modules/notifications/notification.routes';
import { patientRouter } from '../modules/patients/patient-health-file.routes';
import { adminRouter } from '../modules/admin/admin.routes';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/profiles', profileRouter);
apiRouter.use('/appointments', appointmentRouter);
apiRouter.use('/queue', queueRouter);
apiRouter.use('/records', recordRouter);
apiRouter.use('/prescriptions', prescriptionRouter);
apiRouter.use('/labs', labRouter);
apiRouter.use('/reviews', reviewRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/patients', patientRouter);
apiRouter.use('/admin', adminRouter);

export { apiRouter };
