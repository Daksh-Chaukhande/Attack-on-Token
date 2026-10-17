import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middlewares/auth.js';
import { BadRequestError, NotFoundError, ForbiddenError, GoneError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';
import { VerificationMethod } from '@prisma/client';

export async function verifyPickup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ForbiddenError();

    let { token, verificationCode, notes } = req.body;

    // Handle scanned JSON payload if passed as string
    if (token && typeof token === 'string' && token.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(token);
        if (parsed.token) {
          token = parsed.token;
        }
      } catch {
        // use token as-is
      }
    }

    if (verificationCode) {
      verificationCode = verificationCode.trim().toUpperCase();
    }

    if (!token && !verificationCode) {
      throw new BadRequestError('Either QR verification token or 6-character pickup code must be provided');
    }

    // Lookup claim by token or code
    const claim = await prisma.claim.findFirst({
      where: {
        OR: [
          token ? { verificationToken: token.trim() } : undefined,
          verificationCode ? { verificationCode: verificationCode.trim() } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        listing: {
          include: {
            donor: { select: { id: true, name: true, phone: true } },
          },
        },
        claimant: {
          select: { id: true, name: true, phone: true, email: true },
        },
        pickupVerification: true,
      },
    });

    if (!claim) {
      throw new NotFoundError('Invalid pickup token or verification code. Claim not found.');
    }

    // Check who is performing the verification:
    // Authorized: The listing donor, the claimant, or an admin
    const isDonor = claim.listing.donorId === req.user.id;
    const isClaimant = claim.claimantId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isDonor && !isClaimant && !isAdmin) {
      throw new ForbiddenError(
        'You are not authorized to verify this handover. Only the donor, claimant, or administrator can confirm pickup.'
      );
    }

    // Check status
    if (claim.status === 'COMPLETED') {
      throw new BadRequestError('This food claim has already been picked up and verified.');
    }

    if (claim.status === 'CANCELLED') {
      throw new BadRequestError('This food claim was cancelled and is no longer valid for collection.');
    }

    if (claim.status === 'EXPIRED') {
      throw new GoneError('This food claim has expired and pickup is no longer permitted.');
    }

    // Check deadline
    const now = new Date();
    if (claim.pickupDeadline < now) {
      await prisma.claim.update({
        where: { id: claim.id },
        data: { status: 'EXPIRED' },
      });
      throw new GoneError('The pickup window for this food claim has closed.');
    }

    const verificationMethod: VerificationMethod = token ? VerificationMethod.QR_SCAN : VerificationMethod.MANUAL_CODE;

    // Execute atomic completion
    const verification = await prisma.$transaction(async (tx) => {
      // 1. Mark claim as COMPLETED
      await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: 'COMPLETED',
          collectedAt: now,
        },
      });

      // 2. Create pickup verification audit record
      const pv = await tx.pickupVerification.create({
        data: {
          claimId: claim.id,
          verifiedById: req.user!.id,
          verificationMethod,
          verifiedAt: now,
          notes: notes ? notes.trim() : null,
        },
      });

      // 3. Check if all claims are completed and remainingQuantity is 0, update listing to COMPLETED
      const activeClaimsCount = await tx.claim.count({
        where: {
          listingId: claim.listingId,
          status: 'PENDING_PICKUP',
        },
      });

      const listing = await tx.foodListing.findUnique({
        where: { id: claim.listingId },
      });

      if (listing && listing.remainingQuantity.isZero() && activeClaimsCount === 0) {
        await tx.foodListing.update({
          where: { id: listing.id },
          data: { status: 'COMPLETED' },
        });
      }

      // 4. Create in-app notifications
      await tx.notification.create({
        data: {
          userId: claim.claimantId,
          title: 'Pickup Confirmed! 🎉',
          message: `Your pickup of ${claim.quantity} ${claim.quantityUnit} from "${claim.listing.title}" has been verified! Thank you for rescuing food.`,
          type: 'PICKUP_VERIFIED',
          link: `/claims/${claim.id}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: claim.listing.donorId,
          title: 'Food Handover Completed',
          message: `${claim.claimant.name} has collected ${claim.quantity} ${claim.quantityUnit} of "${claim.listing.title}". Verification method: ${verificationMethod}.`,
          type: 'PICKUP_VERIFIED',
          link: `/listings/${claim.listingId}`,
        },
      });

      return pv;
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'PICKUP_VERIFIED',
      entityType: 'Claim',
      entityId: claim.id,
      metadata: {
        method: verificationMethod,
        listingId: claim.listingId,
        quantity: claim.quantity.toString(),
      },
      req,
    });

    return res.json({
      success: true,
      message: 'Pickup verified successfully! Food rescue complete.',
      data: {
        verification,
        claim: {
          id: claim.id,
          status: 'COMPLETED',
          collectedAt: now,
          quantity: claim.quantity,
          quantityUnit: claim.quantityUnit,
          listing: {
            id: claim.listing.id,
            title: claim.listing.title,
          },
          claimant: claim.claimant,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
