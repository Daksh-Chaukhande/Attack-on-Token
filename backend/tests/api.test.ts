import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();

describe('SharePlate API Integration Tests', () => {
  let donorToken: string;
  let volunteerToken: string;
  let testListingId: string;
  let createdClaimId: string;
  let verificationToken: string;
  let verificationCode: string;

  beforeAll(async () => {
    // 1. Authenticate donor
    const donorRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'greenbistro@shareplate.org', password: 'Password123!' });
    expect(donorRes.status).toBe(200);
    donorToken = donorRes.body.data.token;

    // 2. Authenticate volunteer
    const volRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'volunteer1@shareplate.org', password: 'Password123!' });
    expect(volRes.status).toBe(200);
    volunteerToken = volRes.body.data.token;
  });

  describe('Health and System Status', () => {
    it('GET /api/v1/health should return operational status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.service).toBe('SharePlate API');
    });

    it('GET /api/v1/ready should verify database connection', async () => {
      const res = await request(app).get('/api/v1/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('READY');
      expect(res.body.database).toBe('CONNECTED');
    });
  });

  describe('Authentication and RBAC Security', () => {
    it('should reject invalid credentials with generic 401 error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'WrongPassword!' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/v1/auth/me should return authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('greenbistro@shareplate.org');
      expect(res.body.data.user.role).toBe('DONOR');
    });

    it('should forbid non-admin from accessing admin endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${volunteerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Food Listing Operations', () => {
    it('GET /api/v1/listings should return available listings with pagination', async () => {
      const res = await request(app).get('/api/v1/listings?limit=10');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('POST /api/v1/listings should allow a donor to create a food listing', async () => {
      const now = new Date();
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          title: 'Surplus Vegetable Pulao Test Batch',
          description: 'A test batch of fresh vegetable pulao packaged in foil containers.',
          category: 'COOKED_MEALS',
          foodType: 'VEGETARIAN',
          totalQuantity: 15,
          quantityUnit: 'portions',
          estimatedServings: 15,
          allergens: ['Dairy'],
          storageRequirement: 'HOT_HOLD',
          pickupStartTime: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
          pickupEndTime: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
          pickupAddress: '42 Brigade Road, Test Kitchen',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.listing.title).toBe('Surplus Vegetable Pulao Test Batch');
      expect(res.body.data.listing.status).toBe('AVAILABLE');
      testListingId = res.body.data.listing.id;
    });

    it('should forbid a volunteer from creating a food listing (RBAC enforcement)', async () => {
      const now = new Date();
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          title: 'Unauthorized volunteer post',
          description: 'This should fail authorization check',
          category: 'COOKED_MEALS',
          foodType: 'VEGETARIAN',
          totalQuantity: 5,
          quantityUnit: 'portions',
          estimatedServings: 5,
          pickupStartTime: now.toISOString(),
          pickupEndTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          pickupAddress: 'Some Street',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Claim Food & Concurrency Invariant Enforcement', () => {
    it('should allow an authorized volunteer to claim available quantity atomically', async () => {
      const res = await request(app)
        .post(`/api/v1/listings/${testListingId}/claims`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          quantity: 5,
          notes: 'Testing volunteer reservation',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.claim.quantity).toBe('5');
      expect(res.body.data.claim.status).toBe('PENDING_PICKUP');
      expect(res.body.data.claim.verificationCode).toBeDefined();
      expect(res.body.data.claim.qrCodeDataUrl).toContain('data:image/png;base64');

      createdClaimId = res.body.data.claim.id;
      verificationToken = res.body.data.claim.verificationToken;
      verificationCode = res.body.data.claim.verificationCode;

      // Verify listing inventory was decremented
      const checkListing = await prisma.foodListing.findUnique({
        where: { id: testListingId },
      });
      expect(Number(checkListing?.remainingQuantity)).toBe(10);
      expect(Number(checkListing?.reservedQuantity)).toBe(5);
      expect(checkListing?.status).toBe('PARTIALLY_CLAIMED');
    });

    it('should reject claim if requested quantity exceeds available inventory (Overclaiming prevention)', async () => {
      const res = await request(app)
        .post(`/api/v1/listings/${testListingId}/claims`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          quantity: 20, // Only 10 are remaining!
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/exceeds available inventory/i);
    });

    it('should reject a donor from claiming their own food listing', async () => {
      const res = await request(app)
        .post(`/api/v1/listings/${testListingId}/claims`)
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          quantity: 2,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/cannot claim your own/i);
    });
  });

  describe('QR Verification & Handover Completion', () => {
    it('should reject invalid verification tokens', async () => {
      const res = await request(app)
        .post('/api/v1/pickups/verify')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          token: 'invalid_random_token_1234567890',
        });

      expect(res.status).toBe(404);
    });

    it('should successfully verify pickup using QR token and transition claim to COMPLETED', async () => {
      const res = await request(app)
        .post('/api/v1/pickups/verify')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          token: verificationToken,
          notes: 'Handover verified via test QR token',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.claim.status).toBe('COMPLETED');
      expect(res.body.data.verification.verificationMethod).toBe('QR_SCAN');

      // Verify in database
      const claim = await prisma.claim.findUnique({
        where: { id: createdClaimId },
      });
      expect(claim?.status).toBe('COMPLETED');
      expect(claim?.collectedAt).toBeDefined();
    });

    it('should enforce one-time-use semantics and reject already-used tokens', async () => {
      const res = await request(app)
        .post('/api/v1/pickups/verify')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          token: verificationToken,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/already been picked up/i);
    });
  });
});
