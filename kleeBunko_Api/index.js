
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());          // Permite peticiones desde el frontend
app.use(express.json());  // Permite leer JSON en el body de las peticiones

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API funcionando 🚀' });
});

// Ruta de ejemplo
app.get('/api/saludo', (req, res) => {
  res.json({ mensaje: 'Hola desde el backend 👋' });
});

// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});