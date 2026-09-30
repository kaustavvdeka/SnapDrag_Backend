import { Router } from 'express';
import { favoriteController } from '../controllers/favoriteController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, (req, res, next) => favoriteController.getFavorites(req, res, next));
router.post('/toggle/:productId', authenticate, (req, res, next) => favoriteController.toggleFavorite(req, res, next));

export default router;
