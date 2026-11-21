import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { upload, parseMeta, normalizeFieldName } from '../middlewares/novels.middleware.js';
import {
  createNovel, updateNovel, listMyNovels, getNovel, deleteNovel,
} from '../controllers/novels.controller.js';

const router = Router();
router.use(verifyToken);

router.get('/', listMyNovels);
router.get('/:id', getNovel);
router.post(
  '/',
  upload.any(),
  normalizeFieldName,
  parseMeta,
  createNovel
);
router.put(
  '/:id',
  upload.any(),
  normalizeFieldName,
  parseMeta,
  updateNovel
);
router.delete('/:id', deleteNovel);

export default router;