import { Router } from 'express';
import {
  claimFood,
  getMyClaims,
  getClaimById,
  cancelClaim,
} from '../controllers/claimController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { claimFoodSchema } from '../utils/validators.js';

const router = Router();

router.use(authenticate);

router.get('/my', getMyClaims);
router.get('/:id', getClaimById);
router.post('/:id/cancel', cancelClaim);

// Note: claim creation is mounted under /listings/:id/claims and also /claims
router.post('/listings/:id/claims', validate(claimFoodSchema), claimFood);

export default router;
