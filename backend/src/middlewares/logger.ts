import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithId extends Request {
  id?: string;
  startTime?: number;
}

export function requestLogger(req: RequestWithId, res: Response, next: NextFunction) {
  const reqId = (req.headers['x-request-id'] as string) || uuidv4();
  req.id = reqId;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', reqId);

  res.on('finish', () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const logData = {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || req.socket.remoteAddress,
    };

    if (res.statusCode >= 500) {
      console.error('[HTTP-ERROR]', JSON.stringify(logData));
    } else if (res.statusCode >= 400) {
      console.warn('[HTTP-WARN]', JSON.stringify(logData));
    } else {
      console.log('[HTTP-INFO]', `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });

  next();
}
