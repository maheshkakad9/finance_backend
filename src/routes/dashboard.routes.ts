import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { validate } from '../middlewares/validate';
import { dashboardQuerySchema } from '../schemas/record.schema';
import { Role } from '@prisma/client';
 
const router = Router();
 
router.use(authenticate);

router.get(
  '/summary',
  validate(dashboardQuerySchema, 'query'),
  dashboardController.getSummary.bind(dashboardController)
);

router.get(
  '/by-category',
  validate(dashboardQuerySchema, 'query'),
  dashboardController.getByCategory.bind(dashboardController)
);

router.get(
  '/trend',
  requireRole(Role.ANALYST, Role.ADMIN),
  validate(dashboardQuerySchema, 'query'),
  dashboardController.getTrend.bind(dashboardController)
);

router.get(
  '/recent',
  dashboardController.getRecentRecords.bind(dashboardController)
);

export default router;