import { Router } from 'express';
import {
  getAdminMe,
  updateMasterProfile,
  listAdmins,
  createAdmin,
  updateAdmin,
  blockAdmin,
  deleteAdmin,
  getReports,
  sendToReviewQueue,
  getReviewQueue,
  resolveReport,
  getAdminActivity
} from '../controllers/admin.controller.js';
import { verifyToken, requireAdmin, requireMaster } from '../middlewares/auth.middleware.js';

const router = Router();

// El admin actual (master o administrator)
router.get('/me', verifyToken, requireAdmin, getAdminMe);

// Solo el master puede actualizar su propio perfil
router.put('/me', verifyToken, requireMaster, updateMasterProfile);

// Listar admins (master + administrator pueden ver, para que el common vea el panel)
router.get('/admins', verifyToken, requireAdmin, listAdmins);

// CRUD solo para el master
router.post('/admins', verifyToken, requireMaster, createAdmin);
router.put('/admins/:id', verifyToken, requireMaster, updateAdmin);
router.patch('/admins/:id/block', verifyToken, requireMaster, blockAdmin);
router.delete('/admins/:id', verifyToken, requireMaster, deleteAdmin);

// Ruta para reportes (Master y Admin común pueden verla)
router.get('/reports', verifyToken, requireAdmin, getReports);
router.get('/reviews', verifyToken, requireAdmin, getReviewQueue);
router.put('/reports/:id/review', verifyToken, requireAdmin, sendToReviewQueue);
router.post('/reports/:id/resolve', verifyToken, requireAdmin, resolveReport);
router.get('/activity', verifyToken, requireMaster, getAdminActivity);

export default router;