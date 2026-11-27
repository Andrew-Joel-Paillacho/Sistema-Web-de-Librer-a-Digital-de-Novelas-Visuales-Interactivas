import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import novelRoutes from './routes/novels.routes.js';
import readerRoutes from './routes/readers.routes.js';
import publicRoutes from './routes/public.routes.js';
import adminRoutes from './routes/admin.routes.js'

dotenv.config();

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://andrew-joel-paillacho.github.io', 'https://kleebunko.onrender.com'],
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/novels', novelRoutes);
app.use('/api/readers', readerRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes)

// solo una ruta de prueba para verificar que el servidor está corriendo
app.get('/', (req, res) => {
  res.send('API de KleeBunko funcionando correctamente');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});