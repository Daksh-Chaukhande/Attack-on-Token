import { Router } from 'express';
import { verifyPickup } from '../controllers/pickupController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { verifyPickupSchema } from '../utils/validators.js';

const router = Router();

router.use(authenticate);
router.post('/verify', validate(verifyPickupSchema), verifyPickup);

export default router;
