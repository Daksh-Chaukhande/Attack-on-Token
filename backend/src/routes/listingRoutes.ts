import { Router } from 'express';
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  cancelListing,
} from '../controllers/listingController.js';
import { authenticate, authorize, optionalAuthenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createListingSchema, updateListingSchema } from '../utils/validators.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', optionalAuthenticate, getListings);
router.get('/:id', optionalAuthenticate, getListingById);

// Donors and Admins can create listings
router.post(
  '/',
  authenticate,
  authorize([Role.DONOR, Role.ADMIN]),
  validate(createListingSchema),
  createListing
);

// Donors and Admins can update/cancel listings
router.patch(
  '/:id',
  authenticate,
  authorize([Role.DONOR, Role.ADMIN]),
  validate(updateListingSchema),
  updateListing
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize([Role.DONOR, Role.ADMIN]),
  cancelListing
);

export default router;
