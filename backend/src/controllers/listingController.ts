import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middlewares/auth.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';
import { FoodCategory, FoodType, ListingStatus, Prisma } from '@prisma/client';
import { processExpiredListingsAndClaims } from '../services/expirationService.js';

export async function getListings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Run lazy expiration to ensure accurate real-time statuses
    await processExpiredListingsAndClaims();

    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '12', 10)));
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const category = req.query.category as FoodCategory;
    const foodType = req.query.foodType as FoodType;
    const status = req.query.status as ListingStatus;
    const donorOnly = req.query.donorOnly === 'true';
    const sortBy = (req.query.sortBy as string) || 'expiry'; // 'expiry' | 'newest' | 'quantity'

    const where: Prisma.FoodListingWhereInput = {};

    // If caller wants their own listings
    if (donorOnly) {
      if (!req.user) throw new ForbiddenError('Authentication required to view donor listings');
      where.donorId = req.user.id;
    } else {
      // By default, public browse shows AVAILABLE or PARTIALLY_CLAIMED that are not past pickup deadline
      if (status) {
        where.status = status;
      } else {
        where.status = { in: ['AVAILABLE', 'PARTIALLY_CLAIMED'] };
        where.pickupEndTime = { gt: new Date() };
      }
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim() } },
        { description: { contains: search.trim() } },
        { pickupAddress: { contains: search.trim() } },
      ];
    }

    if (category && Object.values(FoodCategory).includes(category)) {
      where.category = category;
    }

    if (foodType && Object.values(FoodType).includes(foodType)) {
      where.foodType = foodType;
    }

    // Determine order
    let orderBy: Prisma.FoodListingOrderByWithRelationInput = { pickupEndTime: 'asc' };
    if (sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sortBy === 'quantity') {
      orderBy = { remainingQuantity: 'desc' };
    }

    const [totalCount, listings] = await Promise.all([
      prisma.foodListing.count({ where }),
      prisma.foodListing.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          donor: {
            select: { id: true, name: true, phone: true, role: true },
          },
          organization: {
            select: { id: true, name: true, type: true, verified: true },
          },
          images: true,
          _count: {
            select: { claims: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      success: true,
      data: {
        items: listings,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getListingById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const listing = await prisma.foodListing.findUnique({
      where: { id },
      include: {
        donor: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
        organization: true,
        images: true,
        claims: {
          include: {
            claimant: {
              select: { id: true, name: true, phone: true, role: true },
            },
            pickupVerification: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!listing) {
      throw new NotFoundError('Food listing not found');
    }

    // Check if listing has reached expiry and auto-update
    if (new Date() >= listing.pickupEndTime && ['AVAILABLE', 'PARTIALLY_CLAIMED'].includes(listing.status)) {
      listing.status = 'EXPIRED';
      await prisma.foodListing.update({
        where: { id: listing.id },
        data: { status: 'EXPIRED' },
      });
    }

    return res.json({
      success: true,
      data: { listing },
    });
  } catch (error) {
    next(error);
  }
}

export async function createListing(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ForbiddenError();

    const {
      title,
      description,
      category,
      foodType,
      totalQuantity,
      quantityUnit,
      estimatedServings,
      allergens,
      storageRequirement,
      preparationDate,
      safeConsumptionDeadline,
      pickupStartTime,
      pickupEndTime,
      pickupAddress,
      latitude,
      longitude,
      specialInstructions,
      contactPreference,
      imageUrl,
      organizationId,
    } = req.body;

    const start = new Date(pickupStartTime);
    const end = new Date(pickupEndTime);
    const now = new Date();

    if (end <= start) {
      throw new BadRequestError('Pickup deadline must be after pickup start time');
    }

    if (end <= now) {
      throw new BadRequestError('Pickup deadline must be set in the future');
    }

    const listing = await prisma.foodListing.create({
      data: {
        donorId: req.user.id,
        organizationId: organizationId || null,
        title: title.trim(),
        description: description.trim(),
        category,
        foodType,
        totalQuantity: new Prisma.Decimal(totalQuantity),
        remainingQuantity: new Prisma.Decimal(totalQuantity),
        reservedQuantity: new Prisma.Decimal(0),
        quantityUnit: quantityUnit.trim(),
        estimatedServings: parseInt(estimatedServings, 10),
        allergens: allergens && allergens.length ? JSON.stringify(allergens) : null,
        storageRequirement,
        preparationDate: preparationDate ? new Date(preparationDate) : null,
        safeConsumptionDeadline: safeConsumptionDeadline ? new Date(safeConsumptionDeadline) : null,
        pickupStartTime: start,
        pickupEndTime: end,
        pickupAddress: pickupAddress.trim(),
        latitude: latitude ? new Prisma.Decimal(latitude) : null,
        longitude: longitude ? new Prisma.Decimal(longitude) : null,
        specialInstructions: specialInstructions ? specialInstructions.trim() : null,
        contactPreference: contactPreference || 'IN_APP',
        status: 'AVAILABLE',
        imageUrl: imageUrl || null,
        images: imageUrl
          ? {
              create: [
                {
                  url: imageUrl,
                  isPrimary: true,
                },
              ],
            }
          : undefined,
      },
      include: {
        images: true,
        organization: true,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'LISTING_CREATED',
      entityType: 'FoodListing',
      entityId: listing.id,
      metadata: { title: listing.title, totalQuantity, quantityUnit },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Food listing published successfully',
      data: { listing },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateListing(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ForbiddenError();
    const { id } = req.params;

    const existing = await prisma.foodListing.findUnique({
      where: { id },
      include: { claims: true },
    });

    if (!existing) {
      throw new NotFoundError('Food listing not found');
    }

    // Must be donor or admin
    if (existing.donorId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission to edit this listing');
    }

    if (existing.status === 'COMPLETED' || existing.status === 'EXPIRED') {
      throw new BadRequestError(`Cannot edit a listing in '${existing.status}' status`);
    }

    const {
      title,
      description,
      category,
      foodType,
      totalQuantity,
      quantityUnit,
      estimatedServings,
      allergens,
      storageRequirement,
      safeConsumptionDeadline,
      pickupStartTime,
      pickupEndTime,
      pickupAddress,
      specialInstructions,
      imageUrl,
    } = req.body;

    const updateData: Prisma.FoodListingUpdateInput = {};

    if (title) updateData.title = title.trim();
    if (description) updateData.description = description.trim();
    if (category) updateData.category = category;
    if (foodType) updateData.foodType = foodType;
    if (quantityUnit) updateData.quantityUnit = quantityUnit.trim();
    if (estimatedServings) updateData.estimatedServings = parseInt(estimatedServings, 10);
    if (allergens) updateData.allergens = JSON.stringify(allergens);
    if (storageRequirement) updateData.storageRequirement = storageRequirement;
    if (safeConsumptionDeadline) updateData.safeConsumptionDeadline = new Date(safeConsumptionDeadline);
    if (pickupStartTime) updateData.pickupStartTime = new Date(pickupStartTime);
    if (pickupEndTime) updateData.pickupEndTime = new Date(pickupEndTime);
    if (pickupAddress) updateData.pickupAddress = pickupAddress.trim();
    if (specialInstructions !== undefined) updateData.specialInstructions = specialInstructions;
    if (imageUrl) updateData.imageUrl = imageUrl;

    // Adjust quantities if totalQuantity changes
    if (totalQuantity !== undefined) {
      const newTotal = new Prisma.Decimal(totalQuantity);
      if (newTotal.lessThan(existing.reservedQuantity)) {
        throw new BadRequestError(
          `Cannot reduce total quantity below currently reserved quantity (${existing.reservedQuantity} ${existing.quantityUnit})`
        );
      }
      updateData.totalQuantity = newTotal;
      updateData.remainingQuantity = newTotal.minus(existing.reservedQuantity);
      if (updateData.remainingQuantity.isZero()) {
        updateData.status = 'FULLY_CLAIMED';
      } else if (existing.reservedQuantity.greaterThan(0)) {
        updateData.status = 'PARTIALLY_CLAIMED';
      } else {
        updateData.status = 'AVAILABLE';
      }
    }

    const updated = await prisma.foodListing.update({
      where: { id },
      data: updateData,
      include: {
        images: true,
        organization: true,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'LISTING_UPDATED',
      entityType: 'FoodListing',
      entityId: id,
      req,
    });

    return res.json({
      success: true,
      message: 'Listing updated successfully',
      data: { listing: updated },
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelListing(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ForbiddenError();
    const { id } = req.params;

    const existing = await prisma.foodListing.findUnique({
      where: { id },
      include: { claims: { where: { status: 'PENDING_PICKUP' } } },
    });

    if (!existing) throw new NotFoundError('Food listing not found');

    if (existing.donorId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission to cancel this listing');
    }

    if (existing.status === 'CANCELLED') {
      throw new BadRequestError('Listing is already cancelled');
    }

    if (existing.status === 'COMPLETED') {
      throw new BadRequestError('Cannot cancel a completed listing');
    }

    // Cancel listing and any pending claims in transaction
    await prisma.$transaction(async (tx) => {
      await tx.foodListing.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // Cancel any pending claims
      for (const claim of existing.claims) {
        await tx.claim.update({
          where: { id: claim.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: 'Listing was cancelled by donor',
          },
        });
      }
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'LISTING_CANCELLED',
      entityType: 'FoodListing',
      entityId: id,
      req,
    });

    return res.json({
      success: true,
      message: 'Food listing cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
}
