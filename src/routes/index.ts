import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import recordRoutes from './record.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

// Record routes
router.use('/records', recordRoutes);

// Dashboard routes
router.use('/dashboard', dashboardRoutes);

// Health Checks
router.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

export default router;