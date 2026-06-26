require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const serviciosRoutes = require('./routes/servicios.routes');
const solicitudesRoutes = require('./routes/solicitudes.routes');
const calificacionesRoutes = require('./routes/calificaciones.routes');
const proveedoresRoutes = require('./routes/proveedores.routes');
const statsRoutes = require('./routes/stats.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Soporta múltiples orígenes separados por coma en CORS_ORIGIN
// Ej: https://sarasanchez3456.github.io,http://localhost:5173
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Permite requests sin origin (Postman, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado para origen: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', nombre: 'Urbify API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/calificaciones', calificacionesRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Ruta ${req.originalUrl} no encontrada` });
});

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Urbify API corriendo en puerto ${PORT}`);
});
