import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middlewares/auth.js';
import { ForbiddenError } from '../utils/errors.js';
import { processExpiredListingsAndClaims } from '../services/expirationService.js';

export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ForbiddenError();

    await processExpiredListingsAndClaims();
    const userId = req.user.id;
    const role = req.user.role;
    const now = new Date();

    if (role === 'DONOR') {
      const [
        activeListingsCount,
        totalDonationsCount,
        pendingClaimsCount,
        completedHandoversCount,
        expiringSoonCount,
        recentListings,
        claims,
      ] = await Promise.all([
        prisma.foodListing.count({
          where: { donorId: userId, status: { in: ['AVAILABLE', 'PARTIALLY_CLAIMED'] }, pickupEndTime: { gt: now } },
        }),
        prisma.foodListing.count({
          where: { donorId: userId },
        }),
        prisma.claim.count({
          where: { listing: { donorId: userId }, status: 'PENDING_PICKUP' },
        }),
        prisma.claim.count({
          where: { listing: { donorId: userId }, status: 'COMPLETED' },
        }),
        prisma.foodListing.count({
          where: {
            donorId: userId,
            status: { in: ['AVAILABLE', 'PARTIALLY_CLAIMED'] },
            pickupEndTime: {
              gt: now,
              lte: new Date(now.getTime() + 4 * 60 * 60 * 1000), // Next 4 hours
            },
          },
        }),
        prisma.foodListing.findMany({
          where: { donorId: userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { _count: { select: { claims: true } } },
        }),
        prisma.claim.findMany({
          where: { listing: { donorId: userId } },
          select: { quantity: true, quantityUnit: true, status: true },
        }),
      ]);

      // Calculate total quantity donated
      let totalKgDonated = 0;
      for (const c of claims) {
        if (c.status === 'COMPLETED') {
          totalKgDonated += Number(c.quantity);
        }
      }

      return res.json({
        success: true,
        data: {
          role,
          metrics: {
            activeListings: activeListingsCount,
            totalDonations: totalDonationsCount,
            pendingClaims: pendingClaimsCount,
            completedHandovers: completedHandoversCount,
            expiringSoon: expiringSoonCount,
            totalQuantityRescued: Math.round(totalKgDonated * 10) / 10,
          },
          recentListings,
        },
      });
    }

    if (role === 'VOLUNTEER') {
      const [
        activeClaimsCount,
        completedPickupsCount,
        availableFoodNearbyCount,
        expiringReservationsCount,
        activeClaims,
      ] = await Promise.all([
        prisma.claim.count({
          where: { claimantId: userId, status: 'PENDING_PICKUP' },
        }),
        prisma.claim.count({
          where: { claimantId: userId, status: 'COMPLETED' },
        }),
        prisma.foodListing.count({
          where: { status: { in: ['AVAILABLE', 'PARTIALLY_CLAIMED'] }, pickupEndTime: { gt: now } },
        }),
        prisma.claim.count({
          where: {
            claimantId: userId,
            status: 'PENDING_PICKUP',
            pickupDeadline: {
              gt: now,
              lte: new Date(now.getTime() + 3 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.claim.findMany({
          where: { claimantId: userId, status: 'PENDING_PICKUP' },
          include: {
            listing: {
              include: { donor: { select: { name: true, phone: true } } },
            },
          },
          orderBy: { pickupDeadline: 'asc' },
          take: 5,
        }),
      ]);

      return res.json({
        success: true,
        data: {
          role,
          metrics: {
            activeClaims: activeClaimsCount,
            completedPickups: completedPickupsCount,
            availableListings: availableFoodNearbyCount,
            expiringReservations: expiringReservationsCount,
          },
          activeClaims,
        },
      });
    }

    if (role === 'NGO' || role === 'COMMUNITY_GROUP') {
      const [
        activeReservationsCount,
        completedCollectionsCount,
        availableDonationsCount,
        allClaims,
        recentCollections,
      ] = await Promise.all([
        prisma.claim.count({
          where: { claimantId: userId, status: 'PENDING_PICKUP' },
        }),
        prisma.claim.count({
          where: { claimantId: userId, status: 'COMPLETED' },
        }),
        prisma.foodListing.count({
          where: { status: { in: ['AVAILABLE', 'PARTIALLY_CLAIMED'] }, pickupEndTime: { gt: now } },
        }),
        prisma.claim.findMany({
          where: { claimantId: userId, status: 'COMPLETED' },
          select: { quantity: true },
        }),
        prisma.claim.findMany({
          where: { claimantId: userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            listing: true,
          },
        }),
      ]);

      const totalQuantityRescued = allClaims.reduce((acc, c) => acc + Number(c.quantity), 0);

      return res.json({
        success: true,
        data: {
          role,
          metrics: {
            activeReservations: activeReservationsCount,
            completedCollections: completedCollectionsCount,
            availableDonations: availableDonationsCount,
            totalQuantityRescued: Math.round(totalQuantityRescued * 10) / 10,
            estimatedMealsProvided: Math.round(totalQuantityRescued * 2.5), // explicit standard 400g per meal estimate
          },
          recentCollections,
        },
      });
    }

    // Fallback: Admin or general
    const [totalUsers, activeListings, totalClaims, completedPickups] = await Promise.all([
      prisma.user.count(),
      prisma.foodListing.count({ where: { status: { in: ['AVAILABLE', 'PARTIALLY_CLAIMED'] } } }),
      prisma.claim.count(),
      prisma.claim.count({ where: { status: 'COMPLETED' } }),
    ]);

    return res.json({
      success: true,
      data: {
        role,
        metrics: {
          totalUsers,
          activeListings,
          totalClaims,
          completedPickups,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
