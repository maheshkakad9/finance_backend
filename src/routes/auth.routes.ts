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

router.post(
    '/register',
    authLimiter,
    validate(registerSchema),
    authController.register.bind(authController)
);

router.post(
    '/login',
    authLimiter,
    validate(loginSchema),
    authController.login.bind(authController)
);

router.post(
    '/refresh',
    validate(refreshTokenSchema),
    authController.refresh.bind(authController)
);

router.post(
    '/logout',
    authenticate,
    authController.logout.bind(authController)
);

router.get(
    '/me',
    authenticate,
    authController.me.bind(authController)
);

export default router;



