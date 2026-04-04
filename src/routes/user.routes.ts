import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { validate } from '../middlewares/validate';
import { updateUserRoleSchema } from '../schemas/record.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate, requireRole(Role.ADMIN));


/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (paginated)
 *     description: Returns a paginated list of all non-deleted users. Admin only. Passwords are never included in the response.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Records per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "Users fetched successfully"
 *               data:
 *                 - id: "550e8400-e29b-41d4-a716-446655440000"
 *                   name: "John Doe"
 *                   email: "john@example.com"
 *                   role: "ANALYST"
 *                   isActive: true
 *                   deletedAt: null
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *               meta:
 *                 total: 25
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 3
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "This action requires one of the following roles: ADMIN"
 *               code: "FORBIDDEN"
 */
router.get('/', userController.getAllUsers.bind(userController));

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a single user by ID
 *     description: Returns the full profile of a specific user. Returns 404 if the user has been soft-deleted. Admin only.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User UUID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "User fetched successfully"
 *               data:
 *                 user:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   name: "John Doe"
 *                   email: "john@example.com"
 *                   role: "VIEWER"
 *                   isActive: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found or already deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "User not found"
 *               code: "NOT_FOUND"
 */
router.get('/:id', userController.getUserById.bind(userController));

/**
 * @swagger
 * /users/{id}/role:
 *   patch:
 *     summary: Update a user's role
 *     description: Changes a user's role to VIEWER, ANALYST, or ADMIN. An admin cannot change their own role. Role change takes effect on the user's next login (existing JWTs still carry the old role until expiry).
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Target user UUID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [VIEWER, ANALYST, ADMIN]
 *                 example: "ANALYST"
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "User role updated successfully"
 *               data:
 *                 user:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   name: "John Doe"
 *                   role: "ANALYST"
 *       403:
 *         description: Cannot change own role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "You cannot change your own role"
 *               code: "FORBIDDEN"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Invalid role value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *             example:
 *               success: false
 *               message: "Validation failed"
 *               fields:
 *                 role: "Invalid enum value. Expected 'VIEWER' | 'ANALYST' | 'ADMIN'"
 */
router.patch(
  '/:id/role',
  validate(updateUserRoleSchema),
  userController.updateUserRole.bind(userController)
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Soft delete a user
 *     description: Marks the user as deleted (sets deletedAt timestamp). The row is NOT removed from the database. The user can no longer log in. Admin cannot delete their own account.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Target user UUID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: User soft-deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "User deleted successfully"
 *               data: {}
 *       403:
 *         description: Cannot delete own account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "You cannot delete your own account"
 *               code: "FORBIDDEN"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', userController.deleteUser.bind(userController));

export default router;
