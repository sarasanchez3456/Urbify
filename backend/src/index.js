// Debe ir primero: carga el .env del entorno y valida la configuración antes de arrancar.
const config = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { query } = require('./config/db');
const { globalLimiter } = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const serviciosRoutes = require('./routes/servicios.routes');
const solicitudesRoutes = require('./routes/solicitudes.routes');
const calificacionesRoutes = require('./routes/calificaciones.routes');
const proveedoresRoutes = require('./routes/proveedores.routes');
const adminRoutes = require('./routes/admin.routes');
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

// /api/health responde siempre (el proceso está vivo). Con ?deep=1 comprueba también la base de datos y
// responde 503 si no contesta: es el endpoint adecuado para el healthcheck de un orquestador.
app.get('/api/health', async (req, res) => {
  const base = { status: 'ok', version: '1.0.0', nombre: 'Urbify API' };
  if (req.query.deep !== '1') return res.json(base);
  try {
    await query('SELECT 1');
    return res.json({ ...base, db: 'ok' });
  } catch {
    return res.status(503).json({ ...base, status: 'degraded', db: 'error' });
  }
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
app.use('/api/admin', adminRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Ruta ${req.originalUrl} no encontrada` });
});

// Manejador global: errores de MySQL por datos del usuario -> 400/409; cuerpo grande -> 413; JSON malo -> 400.
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Urbify API corriendo en puerto ${config.port} (${config.NODE_ENV})`);
});
