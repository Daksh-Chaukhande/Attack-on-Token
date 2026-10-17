import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middlewares/auth.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';
import { ReportStatus } from '@prisma/client';

export async function submitReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ForbiddenError();
    const { listingId, reason, details } = req.body;

    const listing = await prisma.foodListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundError('Food listing not found');
    }

    const report = await prisma.listingReport.create({
      data: {
        listingId,
        reporterId: req.user.id,
        reason: reason.trim(),
        details: details.trim(),
        status: ReportStatus.PENDING,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'LISTING_REPORTED',
      entityType: 'ListingReport',
      entityId: report.id,
      metadata: { listingId, reason },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted. Our moderation team will review this listing.',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'ADMIN') throw new ForbiddenError();

    const status = req.query.status as ReportStatus;
    const where = status ? { status } : {};

    const reports = await prisma.listingReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        listing: {
          include: {
            donor: { select: { id: true, name: true, email: true } },
          },
        },
        reporter: {
          select: { id: true, name: true, email: true, role: true },
        },
        resolvedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return res.json({
      success: true,
      data: { reports },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'ADMIN') throw new ForbiddenError();
    const { id } = req.params;
    const { status, adminNotes, actionOnListing } = req.body;

    const report = await prisma.listingReport.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!report) throw new NotFoundError('Report not found');

    const updated = await prisma.$transaction(async (tx) => {
      const rep = await tx.listingReport.update({
        where: { id },
        data: {
          status,
          adminNotes: adminNotes ? String(adminNotes).trim() : undefined,
          resolvedById: req.user!.id,
          resolvedAt: new Date(),
        },
      });

      if (actionOnListing === 'FLAG' || status === 'ACTION_TAKEN') {
        await tx.foodListing.update({
          where: { id: report.listingId },
          data: { status: 'FLAGGED' },
        });

        await tx.notification.create({
          data: {
            userId: report.listing.donorId,
            title: 'Listing Flagged for Review',
            message: `Your food listing "${report.listing.title}" has been flagged by platform administrators: ${adminNotes || 'Under safety review'}.`,
            type: 'REPORT_UPDATE',
            link: `/listings/${report.listingId}`,
          },
        });
      }

      return rep;
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'REPORT_RESOLVED',
      entityType: 'ListingReport',
      entityId: id,
      metadata: { status, actionOnListing },
      req,
    });

    return res.json({
      success: true,
      message: 'Report resolved successfully',
      data: { report: updated },
    });
  } catch (error) {
    next(error);
  }
}
