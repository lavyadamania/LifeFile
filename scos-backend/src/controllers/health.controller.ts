import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { redis } from '../config/redis';
import { ok } from '../utils/apiResponse';

export async function healthCheck(req: Request, res: Response): Promise<void> {
  const deep = req.query.deep === 'true';

  if (!deep) {
    res.status(StatusCodes.OK).json(
      ok('Service healthy', {
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      })
    );
    return;
  }

  let redisStatus: string;
  try {
    const pong = await redis.ping();
    redisStatus = pong === 'PONG' ? 'connected' : 'unknown';
  } catch {
    redisStatus = 'error';
  }

  res.status(StatusCodes.OK).json(
    ok('Service deep health', {
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      redis: redisStatus
    })
  );
}
