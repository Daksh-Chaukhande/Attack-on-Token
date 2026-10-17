import { z } from 'zod';
import { Role, FoodCategory, FoodType, StorageRequirement } from '@prisma/client';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Please provide a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    name: z.string().min(2, 'Name must be at least 2 characters long'),
    phone: z.string().optional(),
    role: z.nativeEnum(Role).default(Role.VOLUNTEER),
    organizationName: z.string().optional(),
    organizationType: z.string().optional(),
    organizationAddress: z.string().optional(),
    organizationCity: z.string().optional(),
    bio: z.string().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please provide a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    bio: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    notificationsEnabled: z.boolean().optional(),
  }),
});

export const createListingSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    category: z.nativeEnum(FoodCategory),
    foodType: z.nativeEnum(FoodType),
    totalQuantity: z.number().positive('Total quantity must be greater than 0'),
    quantityUnit: z.string().min(1, 'Quantity unit is required (e.g. kg, portions, boxes)'),
    estimatedServings: z.number().int().positive('Estimated servings must be at least 1'),
    allergens: z.array(z.string()).optional(),
    storageRequirement: z.nativeEnum(StorageRequirement).default(StorageRequirement.AMBIENT),
    preparationDate: z.string().datetime().optional().nullable(),
    safeConsumptionDeadline: z.string().datetime().optional().nullable(),
    pickupStartTime: z.string().datetime({ message: 'Valid pickup start time is required' }),
    pickupEndTime: z.string().datetime({ message: 'Valid pickup deadline is required' }),
    pickupAddress: z.string().min(5, 'Pickup address is required'),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    specialInstructions: z.string().optional(),
    contactPreference: z.string().default('IN_APP'),
    imageUrl: z.string().url().optional().or(z.literal('')).nullable(),
    organizationId: z.string().uuid().optional().nullable(),
  }),
});

export const updateListingSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    category: z.nativeEnum(FoodCategory).optional(),
    foodType: z.nativeEnum(FoodType).optional(),
    totalQuantity: z.number().positive().optional(),
    quantityUnit: z.string().optional(),
    estimatedServings: z.number().int().positive().optional(),
    allergens: z.array(z.string()).optional(),
    storageRequirement: z.nativeEnum(StorageRequirement).optional(),
    safeConsumptionDeadline: z.string().datetime().optional().nullable(),
    pickupStartTime: z.string().datetime().optional(),
    pickupEndTime: z.string().datetime().optional(),
    pickupAddress: z.string().optional(),
    specialInstructions: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')).nullable(),
  }),
});

export const claimFoodSchema = z.object({
  body: z.object({
    quantity: z.number().positive('Claim quantity must be greater than 0'),
    notes: z.string().max(500).optional(),
    organizationId: z.string().uuid().optional().nullable(),
  }),
});

export const verifyPickupSchema = z.object({
  body: z.object({
    token: z.string().optional(), // Scanned QR token
    verificationCode: z.string().optional(), // 6-digit alphanumeric manual code
    notes: z.string().optional(),
  }).refine((data) => data.token || data.verificationCode, {
    message: 'Either a QR token or a manual verification code is required',
  }),
});

export const reportListingSchema = z.object({
  body: z.object({
    listingId: z.string().uuid('Invalid listing ID'),
    reason: z.string().min(3, 'Reason is required'),
    details: z.string().min(10, 'Please provide more details for this report'),
  }),
});

export const updateReportSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN']),
    adminNotes: z.string().optional(),
  }),
});
