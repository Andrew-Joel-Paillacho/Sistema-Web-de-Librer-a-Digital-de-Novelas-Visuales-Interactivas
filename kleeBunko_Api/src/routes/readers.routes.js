import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
  getDashboardHome,
  getLibrary,
  createReview,
  getReviewsByNovel,
  deleteReview,
  updateContinueReading,
  getNovelDetails,
  getNovelForReading,
  saveGameSlot,
  finishNovel,
  deleteGameSlot,
  reportNovel
} from '../controllers/readers.controller.js';

const router = Router();
router.use(verifyToken);

router.get('/dashboard', getDashboardHome);
router.get('/library', getLibrary);

router.post('/reviews', createReview);
router.post('/reviews/:id', deleteReview)
router.get('/reviews/:novelId', getReviewsByNovel);

router.put('/continue-reading', updateContinueReading);

// Rutas de guardado
router.post('/save-slot', saveGameSlot)
router.post('/finish-novel', finishNovel)
router.post('/delete-slot', deleteGameSlot)

// Detalles y lectura
router.get('/novels/:novelId', getNovelDetails);
router.get('/novels/:novelId/read', getNovelForReading);
router.post('/report', reportNovel)

export default router;