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


/**
 * @swagger
 * /records:
 *   post:
 *     summary: Create a financial record
 *     description: Creates a new income or expense record owned by the authenticated user. Viewer role gets 403. Amount must be positive with max 2 decimal places (Decimal type — no floating point errors).
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 multipleOf: 0.01
 *                 example: 75000.00
 *                 description: "Positive number, max 2 decimal places"
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE]
 *                 example: "INCOME"
 *               category:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Salary"
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-03-01T00:00:00.000Z"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *                 example: "Monthly salary March 2024"
 *     responses:
 *       201:
 *         description: Record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "Financial record created successfully"
 *               data:
 *                 record:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   userId: "user-uuid"
 *                   amount: "75000.00"
 *                   type: "INCOME"
 *                   category: "Salary"
 *                   date: "2024-03-01T00:00:00.000Z"
 *                   description: "Monthly salary March 2024"
 *                   deletedAt: null
 *                   createdAt: "2024-03-01T10:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Viewer role cannot create records
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "This action requires one of the following roles: ANALYST, ADMIN"
 *               code: "FORBIDDEN"
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *             example:
 *               success: false
 *               message: "Validation failed"
 *               fields:
 *                 amount: "Amount must be a positive number"
 *                 type: "Invalid enum value. Expected 'INCOME' | 'EXPENSE'"
 */
router.post(
  '/',
  requireRole(Role.ANALYST, Role.ADMIN),
  validate(createRecordSchema),
  recordController.createRecord.bind(recordController)
);

/**
 * @swagger
 * /records:
 *   get:
 *     summary: List financial records (role-scoped, paginated, filterable)
 *     description: |
 *       Returns records with full filtering and pagination.
 *       **Role scoping:** VIEWER and ANALYST only see their own records. ADMIN sees all records from all users.
 *       All filters are optional and combinable.
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         example: 10
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [INCOME, EXPENSE]
 *         description: Filter by record type
 *         example: "INCOME"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Case-insensitive partial match on category
 *         example: "salary"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter records on or after this date
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter records on or before this date
 *         example: "2024-12-31T23:59:59.000Z"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, amount, createdAt]
 *           default: date
 *         example: "date"
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         example: "desc"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search across description and category
 *         example: "rent"
 *     responses:
 *       200:
 *         description: Paginated list of records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "Records fetched successfully"
 *               data:
 *                 - id: "record-uuid-1"
 *                   amount: "75000.00"
 *                   type: "INCOME"
 *                   category: "Salary"
 *                   date: "2024-03-01T00:00:00.000Z"
 *                   deletedAt: null
 *               meta:
 *                 total: 47
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 5
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/',
  validate(recordQuerySchema, 'query'),
  recordController.getRecords.bind(recordController)
);

/**
 * @swagger
 * /records/{id}:
 *   get:
 *     summary: Get a single financial record by ID
 *     description: Returns a specific record. VIEWER and ANALYST can only access their own records — accessing another user's record returns 403, not 404 (to avoid leaking IDs). ADMIN can access any record.
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Record UUID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Record found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "Record fetched successfully"
 *               data:
 *                 record:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   amount: "75000.00"
 *                   type: "INCOME"
 *                   category: "Salary"
 *                   date: "2024-03-01T00:00:00.000Z"
 *                   description: "Monthly salary"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Record belongs to another user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "You do not have access to this record"
 *               code: "FORBIDDEN"
 *       404:
 *         description: Record not found or deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', recordController.getRecordById.bind(recordController));

/**
 * @swagger
 * /records/{id}:
 *   patch:
 *     summary: Update a financial record (partial update)
 *     description: |
 *       All fields are optional — only send what you want to change.
 *       **ANALYST:** can only update their own records. Attempting to update another user's record returns 403.
 *       **ADMIN:** can update any record.
 *       **VIEWER:** always gets 403.
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 80000.00
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE]
 *                 example: "INCOME"
 *               category:
 *                 type: string
 *                 example: "Salary"
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-04-01T00:00:00.000Z"
 *               description:
 *                 type: string
 *                 example: "Updated salary for April"
 *     responses:
 *       200:
 *         description: Record updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "Record updated successfully"
 *               data:
 *                 record:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   amount: "80000.00"
 *                   category: "Salary"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Viewer role, or Analyst trying to update another user's record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "You can only update your own records"
 *               code: "FORBIDDEN"
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.patch(
  '/:id',
  requireRole(Role.ANALYST, Role.ADMIN),
  validate(updateRecordSchema),
  recordController.updateRecord.bind(recordController)
);

/**
 * @swagger
 * /records/{id}:
 *   delete:
 *     summary: Soft delete a record (Admin only)
 *     description: Sets deletedAt on the record — does NOT remove the row from the database. The record disappears from all list and detail endpoints. Can be restored via PATCH /records/{id}/restore.
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Record soft-deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Record deleted successfully"
 *               data: {}
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Record not found or already deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  '/:id',
  requireRole(Role.ADMIN),
  recordController.deleteRecord.bind(recordController)
);

/**
 * @swagger
 * /records/{id}/restore:
 *   patch:
 *     summary: Restore a soft-deleted record (Admin only)
 *     description: Clears the deletedAt field, making the record active again. Only works on records that have been soft-deleted. Returns 404 if the record was never deleted.
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the deleted record to restore
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Record restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "Record restored successfully"
 *               data:
 *                 record:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   deletedAt: null
 *                   amount: "75000.00"
 *                   type: "INCOME"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: No deleted record found with this ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Deleted financial record not found"
 *               code: "NOT_FOUND"
 */
router.patch(
  '/:id/restore',
  requireRole(Role.ADMIN),
  recordController.restoreRecord.bind(recordController)
);

export default router;