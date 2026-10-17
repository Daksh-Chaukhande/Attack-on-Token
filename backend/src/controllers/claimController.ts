import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middlewares/auth.js';
import { BadRequestError, NotFoundError, ForbiddenError, GoneError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';
import { generateClaimVerificationTokens } from '../services/qrService.js';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export async function claimFood(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ForbiddenError();
    const { id: listingId } = req.params;
    const { quantity, notes, organizationId } = req.body;

    const requestedQty = new Prisma.Decimal(quantity);
    if (requestedQty.lessThanOrEqualTo(0)) {
      throw new BadRequestError('Claim quantity must be greater than zero');
    }

    const claimId = uuidv4();
    const tokens = await generateClaimVerificationTokens(claimId);

    // Atomically claim within a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current listing state with check
      const currentListing = await tx.foodListing.findUnique({
        where: { id: listingId },
        include: { donor: true },
      });

      if (!currentListing) {
        throw new NotFoundError('Food listing not found');
      }

      // Donor cannot claim their own listing
      if (currentListing.donorId === req.user!.id) {
        throw new BadRequestError('You cannot claim your own donation listing');
      }

      const now = new Date();
      if (currentListing.pickupEndTime <= now) {
        throw new GoneError('This food listing has already expired and cannot be claimed');
      }

      if (['CANCELLED', 'EXPIRED', 'COMPLETED', 'FLAGGED'].includes(currentListing.status)) {
        throw new BadRequestError(`Cannot claim a listing with status '${currentListing.status}'`);
      }

      if (currentListing.remainingQuantity.lessThan(requestedQty)) {
        throw new BadRequestError(
          `Requested quantity (${requestedQty} ${currentListing.quantityUnit}) exceeds available inventory (${currentListing.remainingQuantity} ${currentListing.quantityUnit})`
        );
      }

      // 2. Perform atomic conditional inventory decrement
      const newRemaining = currentListing.remainingQuantity.minus(requestedQty);
      const newReserved = currentListing.reservedQuantity.plus(requestedQty);
      const newStatus = newRemaining.lessThanOrEqualTo(0) ? 'FULLY_CLAIMED' : 'PARTIALLY_CLAIMED';

      const updateResult = await tx.foodListing.updateMany({
        where: {
          id: listingId,
          status: { in: ['AVAILABLE', 'PARTIALLY_CLAIMED'] },
          remainingQuantity: { gte: requestedQty },
        },
        data: {
          remainingQuantity: newRemaining,
          reservedQuantity: newReserved,
          status: newStatus,
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestError('Listing was updated concurrently or remaining inventory is insufficient. Please refresh.');
      }

      // 3. Create the claim record
      const claim = await tx.claim.create({
        data: {
          id: claimId,
          listingId: currentListing.id,
          claimantId: req.user!.id,
          organizationId: organizationId || null,
          quantity: requestedQty,
          quantityUnit: currentListing.quantityUnit,
          status: 'PENDING_PICKUP',
          verificationCode: tokens.verificationCode,
          verificationToken: tokens.verificationToken,
          qrCodeDataUrl: tokens.qrCodeDataUrl,
          notes: notes ? notes.trim() : null,
          pickupDeadline: currentListing.pickupEndTime,
        },
        include: {
          listing: {
            include: {
              donor: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      });

      // 4. Send notifications
      // Notification to Claimant
      await tx.notification.create({
        data: {
          userId: req.user!.id,
          title: 'Claim Confirmed!',
          message: `Your reservation for ${requestedQty} ${currentListing.quantityUnit} of "${currentListing.title}" is confirmed. Pickup code: ${tokens.verificationCode}`,
          type: 'CLAIM_CREATED',
          link: `/claims/${claim.id}`,
        },
      });

      // Notification to Donor
      await tx.notification.create({
        data: {
          userId: currentListing.donorId,
          title: 'New Food Claim!',
          message: `${req.user!.name} has claimed ${requestedQty} ${currentListing.quantityUnit} of "${currentListing.title}". Pickup verification code: ${tokens.verificationCode}`,
          type: 'CLAIM_CREATED',
          link: `/claims/${claim.id}`,
        },
      });

      return claim;
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'FOOD_CLAIMED',
      entityType: 'Claim',
      entityId: result.id,
      metadata: {
        listingId,
        quantity: requestedQty.toString(),
        verificationCode: tokens.verificationCode,
      },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Food claimed successfully! Present your QR code or verification code at pickup.',
      data: { claim: result },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyClaims(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ForbiddenError();

    const status = req.query.status as string;
    const where: Prisma.ClaimWhereInput = {
      claimantId: req.user.id,
    };

    if (status && ['PENDING_PICKUP', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(status)) {
      where.status = status as any;
    }

    const claims = await prisma.claim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        listing: {
          include: {
            donor: { select: { id: true, name: true, phone: true, email: true } },
            organization: true,
          },
        },
        pickupVerification: {
          include: {
            verifiedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    return res.json({
      success: true,
      data: { claims },
    });
  } catch (error) {
    next(error);
  }
}

export async function getClaimById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ForbiddenError();
    const { id } = req.params;

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            donor: { select: { id: true, name: true, phone: true, email: true } },
            organization: true,
          },
        },
        claimant: {
          select: { id: true, name: true, phone: true, email: true, role: true },
        },
        pickupVerification: {
          include: {
            verifiedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!claim) {
      throw new NotFoundError('Claim reservation not found');
    }

    // Permission check: must be claimant, listing donor, or admin
    const isClaimant = claim.claimantId === req.user.id;
    const isDonor = claim.listing.donorId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isClaimant && !isDonor && !isAdmin) {
      throw new ForbiddenError('You do not have permission to view this claim reservation');
    }

    return res.json({
      success: true,
      data: { claim },
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelClaim(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ForbiddenError();
    const { id } = req.params;
    const { reason } = req.body;

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!claim) throw new NotFoundError('Claim not found');

    const isClaimant = claim.claimantId === req.user.id;
    const isDonor = claim.listing.donorId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isClaimant && !isDonor && !isAdmin) {
      throw new ForbiddenError('You are not authorized to cancel this claim');
    }

    if (claim.status !== 'PENDING_PICKUP') {
      throw new BadRequestError(`Cannot cancel a claim in '${claim.status}' state`);
    }

    // Restore inventory and cancel claim in atomic transaction
    await prisma.$transaction(async (tx) => {
      // 1. Mark claim as cancelled
      await tx.claim.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason ? String(reason).trim() : 'Cancelled by user',
        },
      });

      // 2. Return inventory to listing if listing is not expired
      const now = new Date();
      if (claim.listing.pickupEndTime > now && claim.listing.status !== 'CANCELLED') {
        const newRemaining = claim.listing.remainingQuantity.plus(claim.quantity);
        const newReserved = claim.listing.reservedQuantity.minus(claim.quantity);

        await tx.foodListing.update({
          where: { id: claim.listingId },
          data: {
            remainingQuantity: newRemaining,
            reservedQuantity: newReserved.lessThan(0) ? new Prisma.Decimal(0) : newReserved,
            status: newRemaining.greaterThan(0) ? 'AVAILABLE' : 'PARTIALLY_CLAIMED',
          },
        });
      }

      // 3. Send notifications
      const recipientId = isClaimant ? claim.listing.donorId : claim.claimantId;
      await createNotification({
        userId: recipientId,
        title: 'Claim Cancelled',
        message: `Claim for ${claim.quantity} ${claim.quantityUnit} of "${claim.listing.title}" has been cancelled.`,
        type: 'CLAIM_CANCELLED',
        link: `/listings/${claim.listingId}`,
      });
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'CLAIM_CANCELLED',
      entityType: 'Claim',
      entityId: id,
      req,
    });

    return res.json({
      success: true,
      message: 'Claim reservation cancelled and inventory restored',
    });
  } catch (error) {
    next(error);
  }
}
