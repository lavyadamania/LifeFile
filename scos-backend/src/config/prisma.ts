import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: ['warn', 'error']
});

export async function connectPrisma(): Promise<void> {
  await prisma.$connect();
  logger.info('Prisma connected');
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Prisma disconnected');
}
