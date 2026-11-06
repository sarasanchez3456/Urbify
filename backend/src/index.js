// Debe ir primero: carga el .env del entorno y valida la configuración antes de arrancar.
const config = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { globalLimiter } = require('./middleware/rateLimit');
const authRoutes = require('./routes/auth.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const serviciosRoutes = require('./routes/servicios.routes');
const solicitudesRoutes = require('./routes/solicitudes.routes');
const calificacionesRoutes = require('./routes/calificaciones.routes');
const proveedoresRoutes = require('./routes/proveedores.routes');
const statsRoutes = require('./routes/stats.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');

const app = express();

app.disable('x-powered-by');
if (config.trustProxy > 0) {
  app.set('trust proxy', config.trustProxy);
}

if (config.forceHttps) {
  app.use((req, res, next) => {
    if (req.secure) return next();
    // /api/health queda exento para que los balanceadores puedan comprobar el servicio por HTTP.
    if (req.path === '/api/health') return next();
    return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
  });
}

// Cabeceras de seguridad (HSTS, nosniff, frameguard, etc.). La API solo devuelve JSON,
// así que la CSP por defecto de helmet es suficiente.
app.use(helmet({ hsts: config.forceHttps }));

// Solo se aceptan los orígenes de CORS_ORIGIN. Las peticiones sin cabecera Origin
// (app móvil nativa, curl, comprobaciones de salud) no son de navegador y pasan.
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigenes.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
// strict:false acepta cuerpos JSON que no son objeto (p. ej. `null`, que axios envía en un POST sin datos).
// Luego se normaliza a {} para que los controladores puedan desestructurar req.body sin lanzar.
app.use(express.json({ limit: config.bodyLimit, strict: false }));
app.use((req, res, next) => {
  if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) req.body = {};
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', nombre: 'Urbify API' });
});

// Después de /api/health, que debe poder consultarse siempre.
app.use('/api', globalLimiter);

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
  // Body demasiado grande o JSON mal formado: son errores del cliente, no del servidor.
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(config.port, () => {
  console.log(`Urbify API corriendo en puerto ${config.port} (${config.NODE_ENV})`);
});
