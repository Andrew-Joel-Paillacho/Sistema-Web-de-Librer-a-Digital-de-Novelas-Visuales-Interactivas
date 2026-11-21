import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

// Solo admins (master o administrator)
export const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
  next();
};

// Solo el master
export const requireMaster = (req, res, next) => {
  if (req.user?.role !== 'master') {
    return res.status(403).json({ error: 'Solo el Master puede acceder a este recurso' });
  }
  next();
};