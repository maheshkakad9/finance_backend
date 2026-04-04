import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/authenticate';
import { authLimiter } from '../middlewares/rateLimiter';
import {
    loginSchema,
    registerSchema,
    refreshTokenSchema,
} from '../schemas/auth.schema';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john@example.com"
 *         role:
 *           type: string
 *           enum: [VIEWER, ANALYST, ADMIN]
 *           example: "VIEWER"
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00.000Z"
 *
 *     TokensResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         refreshToken:
 *           type: string
 *           example: "a3f5c8d2e1b4..."
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Login successful"
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/UserResponse'
 *             tokens:
 *               $ref: '#/components/schemas/TokensResponse'
 *
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Something went wrong"
 *         code:
 *           type: string
 *           example: "UNAUTHORIZED"
 *
 *     ValidationErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Validation failed"
 *         fields:
 *           type: object
 *           additionalProperties:
 *             type: string
 *           example:
 *             email: "Invalid email address"
 *             password: "Must be at least 8 characters"
 *
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 47
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalPages:
 *           type: integer
 *           example: 5
 *
 *     FinancialRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         userId:
 *           type: string
 *           format: uuid
 *         amount:
 *           type: string
 *           example: "75000.00"
 *           description: "Returned as string to preserve decimal precision"
 *         type:
 *           type: string
 *           enum: [INCOME, EXPENSE]
 *           example: "INCOME"
 *         category:
 *           type: string
 *           example: "Salary"
 *         date:
 *           type: string
 *           format: date-time
 *           example: "2024-03-01T00:00:00.000Z"
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Monthly salary"
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Registration, login, token management
 *   - name: Users
 *     description: User management — Admin only
 *   - name: Records
 *     description: Financial records — role-scoped access
 *   - name: Dashboard
 *     description: Aggregated financial data
 */
 
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user account
 *     description: Creates a new user with VIEWER role by default. Returns access and refresh tokens immediately so the user is logged in after registration.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: "Must contain uppercase, number, and special character"
 *                 example: "SecurePass@123"
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               message: "Account created successfully"
 *               data:
 *                 user:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   name: "John Doe"
 *                   email: "john@example.com"
 *                   role: "VIEWER"
 *                   isActive: true
 *                 tokens:
 *                   accessToken: "eyJhbGci..."
 *                   refreshToken: "a3f5c8d2..."
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "An account with this email already exists"
 *               code: "CONFLICT"
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
 *                 password: "Password must contain at least one uppercase letter"
 *                 email: "Invalid email address"
 */

router.post(
    '/register',
    authLimiter,
    validate(registerSchema),
    authController.register.bind(authController)
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     description: Returns a short-lived access token (15min) and a long-lived refresh token (7 days). Both wrong password and non-existent email return the same 401 message to prevent account enumeration.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "SecurePass@123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               message: "Login successful"
 *               data:
 *                 user:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   name: "John Doe"
 *                   email: "john@example.com"
 *                   role: "ANALYST"
 *                 tokens:
 *                   accessToken: "eyJhbGci..."
 *                   refreshToken: "a3f5c8d2..."
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Invalid email or password"
 *               code: "UNAUTHORIZED"
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post(
    '/login',
    authLimiter,
    validate(loginSchema),
    authController.login.bind(authController)
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     description: Issues a new access token and a new refresh token. The old refresh token is immediately invalidated (rotation). Calling this twice with the same refresh token will return 401 on the second call.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "a3f5c8d2e1b4..."
 *     responses:
 *       200:
 *         description: New token pair issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               success: true
 *               message: "Tokens refreshed successfully"
 *               data:
 *                 tokens:
 *                   accessToken: "eyJhbGci...(new)"
 *                   refreshToken: "x9k2m7n1...(new)"
 *       401:
 *         description: Refresh token invalid, expired, or already used
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Invalid or expired refresh token. Please log in again."
 *               code: "UNAUTHORIZED"
 *       422:
 *         description: refreshToken field missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post(
    '/refresh',
    validate(refreshTokenSchema),
    authController.refresh.bind(authController)
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout — blacklist access token and revoke refresh token
 *     description: The access token's JTI is stored in Redis until expiry. The refresh token is marked revoked in the database. After calling this, both tokens become permanently invalid.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: "Optional but recommended — revokes the refresh token too"
 *                 example: "a3f5c8d2e1b4..."
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Logged out successfully"
 *               data: {}
 *       401:
 *         description: No or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/logout',
    authenticate,
    authController.logout.bind(authController)
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     description: Returns the full profile of the currently logged-in user. Password is never included in the response.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
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
 *                   role: "ANALYST"
 *                   isActive: true
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *       401:
 *         description: Missing, expired, or blacklisted token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Invalid or expired access token"
 *               code: "UNAUTHORIZED"
 */
router.get(
    '/me',
    authenticate,
    authController.me.bind(authController)
);

export default router;



