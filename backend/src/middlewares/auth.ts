import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  name: string;
  status: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.shareplate_token) {
      // 2. Check HttpOnly cookie
      token = req.cookies.shareplate_token;
    }

    if (!token) {
      return next(new UnauthorizedError('Authentication token is missing. Please sign in.'));
    }

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err: any) {
      return next(new UnauthorizedError('Invalid or expired authentication session. Please sign in again.'));
    }

    if (!decoded || !decoded.userId) {
      return next(new UnauthorizedError('Malformed authentication credentials'));
    }

    // Load active user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        status: true,
      },
    });

    if (!user) {
      return next(new UnauthorizedError('User account associated with this token no longer exists'));
    }

    if (user.status === 'SUSPENDED') {
      return next(new ForbiddenError('Your account has been suspended. Please contact platform support.'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
}

// Optional authentication (for public browsing where logged-in context enhances experience)
export async function optionalAuthenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.shareplate_token) {
      token = req.cookies.shareplate_token;
    }

    if (token) {
      try {
        const decoded: any = jwt.verify(token, config.jwtSecret);
        if (decoded?.userId) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true, name: true, status: true },
          });
          if (user && user.status === 'ACTIVE') {
            req.user = user;
          }
        }
      } catch {
        // Ignore invalid token in optional auth
      }
    }
    next();
  } catch {
    next();
  }
}
