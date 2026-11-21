import { Router } from 'express';
import { register, login, logout } from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Ruta protegida de ejemplo
router.get('/me', verifyToken, (req, res) => {
  res.json({ message: 'Acceso autorizado', user: req.user });
});

// Ruta de logout
router.post('/logout', verifyToken, logout);

export default router;