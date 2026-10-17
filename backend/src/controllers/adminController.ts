import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middlewares/auth.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';
import { AccountStatus, Role, Prisma } from '@prisma/client';

export async function getAdminOverview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'ADMIN') throw new ForbiddenError();

    const [
      totalUsers,
      activeDonors,
      activeVolunteers,
      activeOrganizations,
      totalListings,
      activeListings,
      completedListings,
      expiredListings,
      totalClaims,
      completedPickups,
      pendingReports,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.DONOR } }),
      prisma.user.count({ where: { role: Role.VOLUNTEER } }),
      prisma.organization.count(),
      prisma.foodListing.count(),
      prisma.foodListing.count({ where: { status: { in: ['AVAILABLE', 'PARTIALLY_CLAIMED'] } } }),
      prisma.foodListing.count({ where: { status: 'COMPLETED' } }),
      prisma.foodListing.count({ where: { status: 'EXPIRED' } }),
      prisma.claim.count(),
      prisma.claim.count({ where: { status: 'COMPLETED' } }),
      prisma.listingReport.count({ where: { status: 'PENDING' } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { name: true, email: true, role: true } } },
      }),
    ]);

    // Calculate total quantity rescued
    const completedClaims = await prisma.claim.findMany({
      where: { status: 'COMPLETED' },
      select: { quantity: true },
    });
    const totalQuantityRescued = completedClaims.reduce((acc, c) => acc + Number(c.quantity), 0);

    return res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeDonors,
          activeVolunteers,
          activeOrganizations,
          totalListings,
          activeListings,
          completedListings,
          expiredListings,
          totalClaims,
          completedPickups,
          pendingReports,
          totalQuantityRescued: Math.round(totalQuantityRescued * 10) / 10,
          estimatedMealsProvided: Math.round(totalQuantityRescued * 2.5),
        },
        recentAuditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'ADMIN') throw new ForbiddenError();

    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;

    const role = req.query.role as Role;
    const status = req.query.status as AccountStatus;
    const search = req.query.search as string;

    const where: Prisma.UserWhereInput = {};

    if (role && Object.values(Role).includes(role)) {
      where.role = role;
    }

    if (status && Object.values(AccountStatus).includes(status)) {
      where.status = status;
    }

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim() } },
        { email: { contains: search.trim() } },
        { phone: { contains: search.trim() } },
      ];
    }

    const [totalCount, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              listings: true,
              claims: true,
            },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        items: users,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'ADMIN') throw new ForbiddenError();
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'].includes(status)) {
      throw new BadRequestError('Invalid account status');
    }

    // Prevent admin from suspending self
    if (id === req.user.id) {
      throw new BadRequestError('Administrators cannot suspend their own account');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    const updated = await prisma.user.update({
      where: { id },
      data: { status: status as AccountStatus },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'USER_STATUS_UPDATED',
      entityType: 'User',
      entityId: id,
      metadata: { previousStatus: user.status, newStatus: status },
      req,
    });

    return res.json({
      success: true,
      message: `User status updated to ${status}`,
      data: { user: updated },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'ADMIN') throw new ForbiddenError();

    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
    const skip = (page - 1) * limit;

    const action = req.query.action as string;
    const entityType = req.query.entityType as string;

    const where: Prisma.AuditLogWhereInput = {};
    if (action) where.action = { contains: action };
    if (entityType) where.entityType = entityType;

    const [totalCount, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        items: logs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
