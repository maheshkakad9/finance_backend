import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { validate } from '../middlewares/validate';
import { updateUserRoleSchema } from '../schemas/record.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate, requireRole(Role.ADMIN));

router.get('/', userController.getAllUsers.bind(userController));

router.get('/:id', userController.getUserById.bind(userController));

router.patch(
  '/:id/role',
  validate(updateUserRoleSchema),
  userController.updateUserRole.bind(userController)
);

router.delete('/:id', userController.deleteUser.bind(userController));

export default router;
