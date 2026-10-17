import { Router } from 'express';
import {
  getAdminOverview,
  getUsers,
  updateUserStatus,
  getAuditLogs,
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(authorize([Role.ADMIN]));

router.get('/overview', getAdminOverview);
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/audit-logs', getAuditLogs);

export default router;
