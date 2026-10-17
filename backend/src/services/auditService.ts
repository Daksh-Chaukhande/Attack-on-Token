import { Request } from 'express';
import { prisma } from '../lib/prisma.js';

interface AuditLogParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, any>;
  req?: Request;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const ipAddress = params.req ? params.req.ip || params.req.socket.remoteAddress : undefined;
    const userAgent = params.req ? (params.req.headers['user-agent'] as string) : undefined;

    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        ipAddress: ipAddress ? String(ipAddress).substring(0, 50) : null,
        userAgent: userAgent ? userAgent.substring(0, 255) : null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    // Non-blocking: audit logs should not break main execution flow
    console.error('[AUDIT-LOG-ERROR] Failed to record audit log:', error);
  }
}
