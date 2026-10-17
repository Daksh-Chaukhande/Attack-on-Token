import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function getHealth(req: Request, res: Response) {
  const memoryUsage = process.memoryUsage();
  return res.json({
    status: 'OK',
    service: 'SharePlate API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    },
  });
}

export async function getReadiness(req: Request, res: Response) {
  try {
    // Check database readiness
    await prisma.$queryRaw`SELECT 1`;

    return res.json({
      status: 'READY',
      service: 'SharePlate API',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(503).json({
      status: 'NOT_READY',
      service: 'SharePlate API',
      database: 'DISCONNECTED',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
