import { Router } from 'express';
import {
  submitReport,
  getAdminReports,
  updateAdminReport,
} from '../controllers/reportController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { reportListingSchema, updateReportSchema } from '../utils/validators.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Any authenticated user can submit a report
router.post('/', validate(reportListingSchema), submitReport);

// Admin-only endpoints
router.get('/admin', authorize([Role.ADMIN]), getAdminReports);
router.patch('/admin/:id', authorize([Role.ADMIN]), validate(updateReportSchema), updateAdminReport);

export default router;
