require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const serviciosRoutes = require('./routes/servicios.routes');
const solicitudesRoutes = require('./routes/solicitudes.routes');
const calificacionesRoutes = require('./routes/calificaciones.routes');
const proveedoresRoutes = require('./routes/proveedores.routes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
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

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Urbify API corriendo en puerto ${PORT}`);
});
