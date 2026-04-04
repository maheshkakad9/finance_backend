import { Router } from 'express';
import { recordController } from '../controllers/record.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { validate } from '../middlewares/validate';
import {
  createRecordSchema,
  updateRecordSchema,
  recordQuerySchema,
} from '../schemas/record.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  requireRole(Role.ANALYST, Role.ADMIN),
  validate(createRecordSchema),
  recordController.createRecord.bind(recordController)
);

router.get(
  '/',
  validate(recordQuerySchema, 'query'),
  recordController.getRecords.bind(recordController)
);

router.get('/:id', recordController.getRecordById.bind(recordController));

router.patch(
  '/:id',
  requireRole(Role.ANALYST, Role.ADMIN),
  validate(updateRecordSchema),
  recordController.updateRecord.bind(recordController)
);

router.delete(
  '/:id',
  requireRole(Role.ADMIN),
  recordController.deleteRecord.bind(recordController)
);

router.patch(
  '/:id/restore',
  requireRole(Role.ADMIN),
  recordController.restoreRecord.bind(recordController)
);

export default router;