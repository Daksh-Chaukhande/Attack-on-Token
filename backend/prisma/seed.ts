import { PrismaClient, Role, OrganizationType, FoodCategory, FoodType, StorageRequirement } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateClaimVerificationTokens } from '../src/services/qrService.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SharePlate database seed...');

  // Clean existing tables in correct order
  await prisma.pickupVerification.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.listingReport.deleteMany();
  await prisma.foodImage.deleteMany();
  await prisma.foodListing.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  console.log('Creating Seed Users and Profiles...');

  // 1. ADMIN USER
  const admin = await prisma.user.create({
    data: {
      email: 'admin@shareplate.org',
      passwordHash,
      name: 'System Administrator',
      phone: '+91 98765 43210',
      role: Role.ADMIN,
      status: 'ACTIVE',
      profile: {
        create: {
          bio: 'Platform safety, moderation, and infrastructure administrator.',
          city: 'Bengaluru',
          address: 'Tech Innovation Hub, Indiranagar',
          notificationsEnabled: true,
        },
      },
    },
  });

  // 2. DONOR 1 - RESTAURANT
  const donor1 = await prisma.user.create({
    data: {
      email: 'greenbistro@shareplate.org',
      passwordHash,
      name: 'Chef Rajesh Kumar',
      phone: '+91 98111 22233',
      role: Role.DONOR,
      status: 'ACTIVE',
      profile: {
        create: {
          bio: 'Executive Chef committed to zero kitchen waste and neighborhood nourishment.',
          city: 'Bengaluru',
          address: '42 Brigade Road',
          latitude: 12.9716,
          longitude: 77.5946,
        },
      },
      organizations: {
        create: {
          name: 'The Green Bistro & Kitchen',
          type: OrganizationType.RESTAURANT,
          registrationNumber: 'FSSAI-1122334455',
          description: 'Contemporary farm-to-table dining donating surplus daily lunch and dinner courses.',
          address: '42 Brigade Road, Central Business District',
          city: 'Bengaluru',
          phone: '+91 80 4123 4567',
          website: 'https://thegreenbistro.example.com',
          verified: true,
        },
      },
    },
    include: { organizations: true },
  });

  // 3. DONOR 2 - ARTISAN BAKERY
  const donor2 = await prisma.user.create({
    data: {
      email: 'artisanbakery@shareplate.org',
      passwordHash,
      name: 'Sarah D Souza',
      phone: '+91 98222 33344',
      role: Role.DONOR,
      status: 'ACTIVE',
      profile: {
        create: {
          bio: 'Head baker crafting artisanal whole wheat loaves, baguettes and patisserie.',
          city: 'Bengaluru',
          address: '15 Koramangala 4th Block',
          latitude: 12.9352,
          longitude: 77.6245,
        },
      },
      organizations: {
        create: {
          name: 'Golden Crust Artisan Bakery',
          type: OrganizationType.BAKERY,
          registrationNumber: 'FSSAI-9988776655',
          description: 'Traditional slow-ferment sourdough bakery donating wholesome loaves daily.',
          address: '15 Koramangala 4th Block',
          city: 'Bengaluru',
          phone: '+91 80 2555 8899',
          website: 'https://goldencrust.example.com',
          verified: true,
        },
      },
    },
    include: { organizations: true },
  });

  // 4. VOLUNTEER 1
  const volunteer1 = await prisma.user.create({
    data: {
      email: 'volunteer1@shareplate.org',
      passwordHash,
      name: 'Priya Sharma',
      phone: '+91 98333 44455',
      role: Role.VOLUNTEER,
      status: 'ACTIVE',
      profile: {
        create: {
          bio: 'College student & active food rescue volunteer ready for weekend and evening runs.',
          city: 'Bengaluru',
          address: 'HSR Layout Sector 2',
          latitude: 12.9121,
          longitude: 77.6446,
        },
      },
    },
  });

  // 5. VOLUNTEER 2
  const volunteer2 = await prisma.user.create({
    data: {
      email: 'volunteer2@shareplate.org',
      passwordHash,
      name: 'Rahul Verma',
      phone: '+91 98444 55566',
      role: Role.VOLUNTEER,
      status: 'ACTIVE',
      profile: {
        create: {
          bio: 'Tech professional volunteering for morning bakery redistributions.',
          city: 'Bengaluru',
          address: 'Koramangala 6th Block',
          latitude: 12.9345,
          longitude: 77.6211,
        },
      },
    },
  });

  // 6. NGO ORGANIZATION
  const ngoUser = await prisma.user.create({
    data: {
      email: 'hopehouse@shareplate.org',
      passwordHash,
      name: 'Sister Mary Teresa',
      phone: '+91 98555 66677',
      role: Role.NGO,
      status: 'ACTIVE',
      profile: {
        create: {
          bio: 'Director at Hope House providing emergency shelter and warm meals to 120 residents daily.',
          city: 'Bengaluru',
          address: '88 Austin Town',
          latitude: 12.9602,
          longitude: 77.6189,
        },
      },
      organizations: {
        create: {
          name: 'Hope House Community Shelter',
          type: OrganizationType.NGO_SHELTER,
          registrationNumber: 'NGO-DARPAN-KA-2018-00912',
          description: 'Registered nonprofit shelter providing food, healthcare, and transition support.',
          address: '88 Austin Town, Neelasandra',
          city: 'Bengaluru',
          phone: '+91 80 2345 6789',
          website: 'https://hopehouseshelter.example.org',
          verified: true,
        },
      },
    },
    include: { organizations: true },
  });

  // 7. COMMUNITY GROUP
  const communityUser = await prisma.user.create({
    data: {
      email: 'citykitchen@shareplate.org',
      passwordHash,
      name: 'Anil Kumble',
      phone: '+91 98666 77788',
      role: Role.COMMUNITY_GROUP,
      status: 'ACTIVE',
      profile: {
        create: {
          bio: 'Neighborhood mutual-aid organizer coordinating community pantries.',
          city: 'Bengaluru',
          address: 'BTM Layout 2nd Stage',
          latitude: 12.9166,
          longitude: 77.6101,
        },
      },
      organizations: {
        create: {
          name: 'Unity Community Food Circle',
          type: OrganizationType.COMMUNITY_KITCHEN,
          description: 'Grassroots volunteer network distributing hot meals to construction workers and elderly residents.',
          address: 'BTM Layout 2nd Stage',
          city: 'Bengaluru',
          phone: '+91 98666 77788',
          verified: true,
        },
      },
    },
    include: { organizations: true },
  });

  console.log('Creating Seed Food Listings...');

  const now = new Date();

  // Listing 1: Cooked Meal Boxes (Available, expires in 4 hours)
  const listing1 = await prisma.foodListing.create({
    data: {
      donorId: donor1.id,
      organizationId: donor1.organizations[0].id,
      title: 'Freshly Prepared Dal Makhani, Jeera Rice & Phulkas',
      description:
        'Nutritious, warm North Indian lunch boxes prepared today at 12:30 PM. Packed in food-grade insulated containers. Ideal for immediate distribution to community groups or shelters.',
      category: FoodCategory.COOKED_MEALS,
      foodType: FoodType.VEGETARIAN,
      totalQuantity: 30,
      reservedQuantity: 10,
      remainingQuantity: 20,
      quantityUnit: 'boxes',
      estimatedServings: 30,
      allergens: JSON.stringify(['Dairy', 'Gluten']),
      storageRequirement: StorageRequirement.HOT_HOLD,
      preparationDate: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      safeConsumptionDeadline: new Date(now.getTime() + 6 * 60 * 60 * 1000),
      pickupStartTime: now,
      pickupEndTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      pickupAddress: 'The Green Bistro, 42 Brigade Road, Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
      specialInstructions: 'Come to the kitchen back entrance via the service alley. Ask for Sous Chef Anand.',
      status: 'PARTIALLY_CLAIMED',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    },
  });

  // Listing 2: Artisan Sourdough Loaves & Croissants (Available, expires in 7 hours)
  const listing2 = await prisma.foodListing.create({
    data: {
      donorId: donor2.id,
      organizationId: donor2.organizations[0].id,
      title: 'Assorted Country Sourdough Loaves & Butter Croissants',
      description:
        'Freshly baked today at 6:00 AM. Includes 12 country sourdough boules and 15 butter croissants. Completely fresh, safe, and ready for table consumption or pantry storage.',
      category: FoodCategory.BAKERY,
      foodType: FoodType.VEGETARIAN,
      totalQuantity: 25,
      reservedQuantity: 0,
      remainingQuantity: 25,
      quantityUnit: 'portions',
      estimatedServings: 25,
      allergens: JSON.stringify(['Gluten', 'Dairy']),
      storageRequirement: StorageRequirement.AMBIENT,
      preparationDate: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      safeConsumptionDeadline: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      pickupStartTime: now,
      pickupEndTime: new Date(now.getTime() + 7 * 60 * 60 * 1000),
      pickupAddress: 'Golden Crust Bakery, 15 Koramangala 4th Block, Bengaluru',
      latitude: 12.9352,
      longitude: 77.6245,
      specialInstructions: 'Park in front customer bays. Speak with front counter manager Sarah.',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    },
  });

  // Listing 3: Organic Farm Vegetables (Available, expires in 12 hours)
  const listing3 = await prisma.foodListing.create({
    data: {
      donorId: donor1.id,
      organizationId: donor1.organizations[0].id,
      title: 'Farm-Fresh Spinach, Crisp Carrots & Baby Potatoes',
      description:
        'Crated surplus organic produce delivered directly from Nilgiris farmers this morning. Crisp, unblemished, and ideal for large community kitchens and soup pantries.',
      category: FoodCategory.VEGETABLES,
      foodType: FoodType.VEGAN,
      totalQuantity: 45,
      reservedQuantity: 0,
      remainingQuantity: 45,
      quantityUnit: 'kg',
      estimatedServings: 90,
      allergens: JSON.stringify(['None']),
      storageRequirement: StorageRequirement.AMBIENT,
      pickupStartTime: now,
      pickupEndTime: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      pickupAddress: 'The Green Bistro Loading Dock, Brigade Road, Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
      specialInstructions: 'Bring clean crates or reusable sacks. Forklift and ramp available at loading dock.',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    },
  });

  // Listing 4: Whole Milk & Greek Yogurt Tubs (Expires in 2.5 hours, Urgent)
  const listing4 = await prisma.foodListing.create({
    data: {
      donorId: donor1.id,
      organizationId: donor1.organizations[0].id,
      title: 'Chilled Organic Whole Milk (1L) & Greek Yogurt Tubs',
      description:
        'Cold-chain maintained surplus pasteurized dairy. 10 bottles of whole milk and 8 large Greek yogurt tubs. Stored continuously at 3°C.',
      category: FoodCategory.DAIRY,
      foodType: FoodType.VEGETARIAN,
      totalQuantity: 18,
      reservedQuantity: 0,
      remainingQuantity: 18,
      quantityUnit: 'liters',
      estimatedServings: 35,
      allergens: JSON.stringify(['Dairy']),
      storageRequirement: StorageRequirement.REFRIGERATED,
      safeConsumptionDeadline: new Date(now.getTime() + 14 * 60 * 60 * 1000),
      pickupStartTime: now,
      pickupEndTime: new Date(now.getTime() + 2.5 * 60 * 60 * 1000),
      pickupAddress: 'The Green Bistro Cold Storage Unit, Brigade Road, Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
      specialInstructions: 'Chilled transport / cooler bags required for safe pickup.',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=800&q=80',
    },
  });

  // Listing 5: Completed Food Listing with Verified Pickup History
  const listing5 = await prisma.foodListing.create({
    data: {
      donorId: donor2.id,
      organizationId: donor2.organizations[0].id,
      title: 'Whole Grain Dinner Rolls & Focaccia Slices',
      description: 'Morning batch baked yesterday afternoon, distributed to Unity Community Food Circle.',
      category: FoodCategory.BAKERY,
      foodType: FoodType.VEGAN,
      totalQuantity: 20,
      reservedQuantity: 20,
      remainingQuantity: 0,
      quantityUnit: 'portions',
      estimatedServings: 20,
      allergens: JSON.stringify(['Gluten']),
      storageRequirement: StorageRequirement.AMBIENT,
      pickupStartTime: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      pickupEndTime: new Date(now.getTime() - 18 * 60 * 60 * 1000),
      pickupAddress: 'Golden Crust Bakery, Koramangala 4th Block',
      status: 'COMPLETED',
      imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=800&q=80',
    },
  });

  console.log('Creating Seed Claims and QR Verifications...');

  // Active claim 1 for listing 1 by Volunteer Priya Sharma
  const claim1Id = uuidv4();
  const tokens1 = await generateClaimVerificationTokens(claim1Id);
  const claim1 = await prisma.claim.create({
    data: {
      id: claim1Id,
      listingId: listing1.id,
      claimantId: volunteer1.id,
      quantity: 10,
      quantityUnit: 'boxes',
      status: 'PENDING_PICKUP',
      verificationCode: tokens1.verificationCode,
      verificationToken: tokens1.verificationToken,
      qrCodeDataUrl: tokens1.qrCodeDataUrl,
      notes: 'Collecting for migrant labor camp transit shelter near Neelasandra.',
      claimedAt: new Date(now.getTime() - 30 * 60 * 1000),
      pickupDeadline: listing1.pickupEndTime,
    },
  });

  // Completed claim for listing 5 by Community Group Anil Kumble
  const claim2Id = uuidv4();
  const tokens2 = await generateClaimVerificationTokens(claim2Id);
  const claim2 = await prisma.claim.create({
    data: {
      id: claim2Id,
      listingId: listing5.id,
      claimantId: communityUser.id,
      organizationId: communityUser.organizations[0].id,
      quantity: 20,
      quantityUnit: 'portions',
      status: 'COMPLETED',
      verificationCode: tokens2.verificationCode,
      verificationToken: tokens2.verificationToken,
      qrCodeDataUrl: tokens2.qrCodeDataUrl,
      notes: 'Delivered directly to evening soup run.',
      claimedAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      pickupDeadline: listing5.pickupEndTime,
      collectedAt: new Date(now.getTime() - 19 * 60 * 60 * 1000),
    },
  });

  // Record pickup verification for completed claim
  await prisma.pickupVerification.create({
    data: {
      claimId: claim2.id,
      verifiedById: donor2.id,
      verificationMethod: 'QR_SCAN',
      verifiedAt: new Date(now.getTime() - 19 * 60 * 60 * 1000),
      notes: 'QR code scanned by Sarah at bakery counter. Handover confirmed in 3 boxes.',
    },
  });

  console.log('Creating Seed In-App Notifications...');

  await prisma.notification.createMany({
    data: [
      {
        userId: volunteer1.id,
        title: 'Claim Confirmed! 🎉',
        message: `Your reservation for 10 boxes of "${listing1.title}" is confirmed. Pickup code: ${tokens1.verificationCode}`,
        type: 'CLAIM_CREATED',
        link: `/claims/${claim1.id}`,
        isRead: false,
      },
      {
        userId: donor1.id,
        title: 'New Food Claim!',
        message: `Priya Sharma has reserved 10 boxes of "${listing1.title}". Pickup code: ${tokens1.verificationCode}`,
        type: 'CLAIM_CREATED',
        link: `/claims/${claim1.id}`,
        isRead: false,
      },
      {
        userId: communityUser.id,
        title: 'Pickup Confirmed! 🎉',
        message: `Your pickup of 20 portions from "${listing5.title}" was verified and recorded.`,
        type: 'PICKUP_VERIFIED',
        link: `/claims/${claim2.id}`,
        isRead: true,
      },
    ],
  });

  console.log('Creating Sample Audit Logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        userId: donor1.id,
        action: 'LISTING_CREATED',
        entityType: 'FoodListing',
        entityId: listing1.id,
        metadata: JSON.stringify({ title: listing1.title, totalQuantity: '30' }),
      },
      {
        userId: volunteer1.id,
        action: 'FOOD_CLAIMED',
        entityType: 'Claim',
        entityId: claim1.id,
        metadata: JSON.stringify({ quantity: '10', code: tokens1.verificationCode }),
      },
      {
        userId: donor2.id,
        action: 'PICKUP_VERIFIED',
        entityType: 'Claim',
        entityId: claim2.id,
        metadata: JSON.stringify({ method: 'QR_SCAN', quantity: '20' }),
      },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('---------------------------------------------------------');
  console.log('TEST CREDENTIALS (ALL PASSWORDS: Password123!)');
  console.log('👑 Admin:           admin@shareplate.org');
  console.log('👨‍🍳 Donor (Chef):    greenbistro@shareplate.org');
  console.log('🥖 Donor (Bakery):  artisanbakery@shareplate.org');
  console.log('🚲 Volunteer 1:     volunteer1@shareplate.org');
  console.log('🚲 Volunteer 2:     volunteer2@shareplate.org');
  console.log('🏠 NGO Shelter:     hopehouse@shareplate.org');
  console.log('🍲 Community Group: citykitchen@shareplate.org');
  console.log('---------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
