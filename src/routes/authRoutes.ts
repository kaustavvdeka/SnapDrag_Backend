import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/authValidator.js';

const router = Router();

router.post('/register', validateBody(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post('/login', validateBody(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/google', (req, res, next) => authController.googleLogin(req, res, next));
router.get('/google/url', (req, res, next) => authController.getGoogleAuthUrl(req, res, next));
router.post('/refresh', validateBody(refreshTokenSchema), (req, res, next) => authController.refreshToken(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getProfile(req, res, next));

export default router;
