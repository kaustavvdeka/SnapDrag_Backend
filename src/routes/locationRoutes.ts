import { Router } from 'express';
import { locationController } from '../controllers/locationController.js';

const router = Router();

router.get('/cities', (req, res, next) => locationController.getCities(req, res, next));
router.get('/malls', (req, res, next) => locationController.getMalls(req, res, next));
router.get('/malls/:id', (req, res, next) => locationController.getMallById(req, res, next));

export default router;
