import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { validate } from '../middlewares/validate';
import { dashboardQuerySchema } from '../schemas/record.schema';
import { Role } from '@prisma/client';
 
const router = Router();
 
router.use(authenticate);

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     summary: Get total income, expenses, and net balance
 *     description: |
 *       Returns aggregated financial totals. Results are cached in Redis for 60 seconds.
 *       **Role scoping:** VIEWER and ANALYST only see their own records in the totals. ADMIN sees all users combined.
 *       Use startDate/endDate to filter by a specific period.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include records on or after this date
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include records on or before this date
 *         example: "2024-12-31T23:59:59.000Z"
 *     responses:
 *       200:
 *         description: Financial summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "Dashboard summary fetched successfully"
 *               data:
 *                 totalIncome: 150000
 *                 totalExpenses: 45000
 *                 netBalance: 105000
 *                 incomeCount: 3
 *                 expenseCount: 5
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get(
  '/summary',
  validate(dashboardQuerySchema, 'query'),
  dashboardController.getSummary.bind(dashboardController)
);

/**
 * @swagger
 * /dashboard/by-category:
 *   get:
 *     summary: Get income and expense breakdown by category
 *     description: |
 *       Groups all records by category and type, returning totals and counts for each group. Multiple records in the same category are merged into one row.
 *       Results are cached for 60 seconds.
 *       **Role scoping:** Same as summary — VIEWER/ANALYST see their own data, ADMIN sees all.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2024-12-31T23:59:59.000Z"
 *     responses:
 *       200:
 *         description: Category breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "Category breakdown fetched successfully"
 *               data:
 *                 - category: "Salary"
 *                   type: "INCOME"
 *                   total: 150000
 *                   count: 3
 *                 - category: "Rent"
 *                   type: "EXPENSE"
 *                   total: 36000
 *                   count: 12
 *                 - category: "Groceries"
 *                   type: "EXPENSE"
 *                   total: 9000
 *                   count: 45
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/by-category',
  validate(dashboardQuerySchema, 'query'),
  dashboardController.getByCategory.bind(dashboardController)
);

/**
 * @swagger
 * /dashboard/trend:
 *   get:
 *     summary: Get weekly income and expense trend (Analyst and Admin only)
 *     description: |
 *       Returns weekly aggregated totals grouped by record type for the last 24 weeks (or filtered range). Uses PostgreSQL DATE_TRUNC for accurate week grouping.
 *       Results are cached for 60 seconds.
 *       **VIEWER role gets 403** — trend data is restricted to Analyst and Admin.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2024-12-31T23:59:59.000Z"
 *     responses:
 *       200:
 *         description: Weekly trend data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "Weekly trend fetched successfully"
 *               data:
 *                 - week: "2024-03-04T00:00:00.000Z"
 *                   type: "INCOME"
 *                   total: 75000
 *                   count: 1
 *                 - week: "2024-03-04T00:00:00.000Z"
 *                   type: "EXPENSE"
 *                   total: 12500
 *                   count: 2
 *                 - week: "2024-02-26T00:00:00.000Z"
 *                   type: "INCOME"
 *                   total: 75000
 *                   count: 1
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Viewer role not allowed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "This action requires one of the following roles: ANALYST, ADMIN"
 *               code: "FORBIDDEN"
 */
router.get(
  '/trend',
  requireRole(Role.ANALYST, Role.ADMIN),
  validate(dashboardQuerySchema, 'query'),
  dashboardController.getTrend.bind(dashboardController)
);

/**
 * @swagger
 * /dashboard/recent:
 *   get:
 *     summary: Get the most recent financial records
 *     description: |
 *       Returns the N most recent records ordered by date descending. Max limit is 50.
 *       **Role scoping:** VIEWER and ANALYST only see their own records. ADMIN sees all users.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of records to return
 *         example: 5
 *     responses:
 *       200:
 *         description: Recent records list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "Recent records fetched successfully"
 *               data:
 *                 - id: "record-uuid-1"
 *                   amount: "75000.00"
 *                   type: "INCOME"
 *                   category: "Salary"
 *                   date: "2024-03-01T00:00:00.000Z"
 *                   user:
 *                     id: "user-uuid"
 *                     name: "John Doe"
 *                     email: "john@example.com"
 *                 - id: "record-uuid-2"
 *                   amount: "12500.50"
 *                   type: "EXPENSE"
 *                   category: "Rent"
 *                   date: "2024-02-28T00:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/recent',
  dashboardController.getRecentRecords.bind(dashboardController)
);

export default router;