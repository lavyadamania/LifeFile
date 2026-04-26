import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { connectPrisma, disconnectPrisma } from './config/prisma';
import { connectRedis, disconnectRedis } from './config/redis';
import { setSocketServer } from './config/socket';
import { env } from './config/env';
import { logger } from './config/logger';

const app = createApp();
const httpServer = http.createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true
  }
});

setSocketServer(io);

io.on('connection', (socket) => {
  logger.info('Socket connected', { socketId: socket.id });

  socket.on('queue:subscribe', (payload: { clinicId: string; doctorId: string }) => {
    socket.join(`queue:${payload.clinicId}:${payload.doctorId}`);
  });

  socket.on('queue:unsubscribe', (payload: { clinicId: string; doctorId: string }) => {
    socket.leave(`queue:${payload.clinicId}:${payload.doctorId}`);
  });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected', { socketId: socket.id });
  });
});

async function bootstrap(): Promise<void> {
  await connectPrisma();
  await connectRedis();

  httpServer.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
  });
}

void bootstrap();

async function shutdown(signal: string): Promise<void> {
  logger.warn(`Shutting down due to ${signal}`);
  await disconnectRedis();
  await disconnectPrisma();
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
