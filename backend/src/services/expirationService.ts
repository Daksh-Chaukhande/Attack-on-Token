import { prisma } from '../lib/prisma.js';
import { createNotification } from './notificationService.js';
import { createAuditLog } from './auditService.js';

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

export async function processExpiredListingsAndClaims(): Promise<{
  expiredListingsCount: number;
  expiredClaimsCount: number;
}> {
  if (isRunning) {
    return { expiredListingsCount: 0, expiredClaimsCount: 0 };
  }

  isRunning = true;
  const now = new Date();

  try {
    // 1. Find all listings that have passed pickupEndTime but are still marked AVAILABLE or PARTIALLY_CLAIMED
    const expiredListings = await prisma.foodListing.findMany({
      where: {
        pickupEndTime: { lte: now },
        status: { in: ['AVAILABLE', 'PARTIALLY_CLAIMED'] },
      },
      select: {
        id: true,
        title: true,
        donorId: true,
      },
    });

    let expiredListingsCount = 0;
    for (const listing of expiredListings) {
      await prisma.foodListing.update({
        where: { id: listing.id },
        data: { status: 'EXPIRED' },
      });
      expiredListingsCount++;

      // Send notification to donor
      await createNotification({
        userId: listing.donorId,
        title: 'Listing Expired',
        message: `Your food listing "${listing.title}" has reached its pickup deadline and is now marked as expired.`,
        type: 'LISTING_EXPIRED',
        link: `/listings/${listing.id}`,
      });

      await createAuditLog({
        userId: null,
        action: 'LISTING_AUTO_EXPIRED',
        entityType: 'FoodListing',
        entityId: listing.id,
        metadata: { title: listing.title, expiredAt: now.toISOString() },
      });
    }

    // 2. Find pending claims that have passed their pickupDeadline without collection
    const expiredClaims = await prisma.claim.findMany({
      where: {
        pickupDeadline: { lte: now },
        status: 'PENDING_PICKUP',
      },
      include: {
        listing: true,
      },
    });

    let expiredClaimsCount = 0;
    for (const claim of expiredClaims) {
      await prisma.claim.update({
        where: { id: claim.id },
        data: {
          status: 'EXPIRED',
          cancellationReason: 'Pickup deadline expired before verification',
        },
      });
      expiredClaimsCount++;

      // Notify claimant
      await createNotification({
        userId: claim.claimantId,
        title: 'Pickup Reservation Expired',
        message: `Your claim for "${claim.listing.title}" expired as it was not collected before the deadline.`,
        type: 'CLAIM_CANCELLED',
        link: `/claims/${claim.id}`,
      });

      // Notify donor
      await createNotification({
        userId: claim.listing.donorId,
        title: 'Uncollected Claim Expired',
        message: `A claim of ${claim.quantity} ${claim.quantityUnit} for "${claim.listing.title}" was not collected and has expired.`,
        type: 'CLAIM_CANCELLED',
        link: `/listings/${claim.listing.id}`,
      });

      await createAuditLog({
        userId: null,
        action: 'CLAIM_AUTO_EXPIRED',
        entityType: 'Claim',
        entityId: claim.id,
        metadata: { listingId: claim.listingId, expiredAt: now.toISOString() },
      });
    }

    if (expiredListingsCount > 0 || expiredClaimsCount > 0) {
      console.log(
        `[EXPIRATION-SERVICE] Processed at ${now.toISOString()}: ${expiredListingsCount} listings expired, ${expiredClaimsCount} claims expired.`
      );
    }

    return { expiredListingsCount, expiredClaimsCount };
  } catch (error) {
    console.error('[EXPIRATION-SERVICE-ERROR] Error processing expirations:', error);
    return { expiredListingsCount: 0, expiredClaimsCount: 0 };
  } finally {
    isRunning = false;
  }
}

export function startExpirationWorker(intervalMs = 60000) {
  if (intervalId) return;
  console.log(`[EXPIRATION-WORKER] Started with interval ${intervalMs}ms`);
  // Run once immediately on startup
  processExpiredListingsAndClaims().catch(console.error);
  intervalId = setInterval(() => {
    processExpiredListingsAndClaims().catch(console.error);
  }, intervalMs);
}

export function stopExpirationWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[EXPIRATION-WORKER] Stopped');
  }
}
