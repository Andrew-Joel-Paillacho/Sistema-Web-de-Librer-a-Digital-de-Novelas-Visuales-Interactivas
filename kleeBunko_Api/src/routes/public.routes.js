import { Router } from 'express';
import { getTopByRating, getTopByViews } from '../controllers/public.controller.js';

const router = Router();

// SIN verifyToken: rutas públicas
router.get('/top-by-rating', getTopByRating);
router.get('/top-by-views', getTopByViews);

export default router;