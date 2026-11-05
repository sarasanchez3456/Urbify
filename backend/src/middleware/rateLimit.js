// Límites de peticiones. Valores y ventanas configurables por entorno (ver config/env.js).
// El almacenamiento es en memoria: válido para una sola instancia del backend. Con varias
// instancias hay que cambiar el `store` por uno compartido (p. ej. Redis).
const { rateLimit: limiterFactory, ipKeyGenerator } = require('express-rate-limit');
const { rateLimit: cfg } = require('../config/env');

const MINUTO_MS = 60 * 1000;
const HORA_MS = 60 * MINUTO_MS;

// Respuesta 429 uniforme. Conserva `bloqueado` y `minutos_restantes`, que el frontend usa para
// mostrar la cuenta regresiva. Retry-After y RateLimit-* los añade la librería.
function crearLimitador({ ventanaMs, max, mensaje, key, skipSuccessfulRequests = false }) {
  return limiterFactory({
    windowMs: ventanaMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: () => !cfg.habilitado,
    ...(key ? { keyGenerator: key } : {}),
    handler: (req, res) => {
      const restanteMs = req.rateLimit?.resetTime ? req.rateLimit.resetTime.getTime() - Date.now() : ventanaMs;
      res.status(429).json({
        error: mensaje,
        bloqueado: true,
        minutos_restantes: Math.max(1, Math.ceil(restanteMs / MINUTO_MS)),
      });
    },
  });
}

const ip = (req) => ipKeyGenerator(req.ip);
const correoDe = (req) => String(req.body?.correo || '').trim().toLowerCase().slice(0, 254);

// Todas las rutas /api (excepto /api/health).
const globalLimiter = crearLimitador({
  ventanaMs: cfg.ventanaMs,
  max: cfg.global,
  mensaje: 'Demasiadas peticiones. Intenta de nuevo en unos minutos.',
  key: ip,
});

// Endpoints públicos de lectura que no requieren sesión.
const publicLimiter = crearLimitador({
  ventanaMs: MINUTO_MS,
  max: cfg.publico,
  mensaje: 'Demasiadas consultas. Espera un momento e intenta de nuevo.',
  key: ip,
});

const registroLimiter = crearLimitador({
  ventanaMs: HORA_MS,
  max: cfg.registro,
  mensaje: 'Demasiados registros desde esta red. Intenta de nuevo más tarde.',
  key: ip,
});

// Login: tres límites en cadena. Los dos por cuenta solo cuentan los intentos fallidos,
// así un inicio de sesión correcto no consume cupo.
//  1) por IP (cualquier intento): frena el barrido de muchas cuentas desde un origen.
//  2) por cuenta + IP: frena la fuerza bruta sin bloquear a la persona real, que entra desde otra IP.
//     Sustituye al bloqueo de cuenta de 5 min tras 3 fallos, con el que un tercero podía dejar
//     fuera a cualquiera solo escribiendo su correo.
//  3) por cuenta (cualquier IP): tope alto contra ataques distribuidos.
const loginLimiters = [
  crearLimitador({
    ventanaMs: cfg.ventanaMs,
    max: cfg.loginIp,
    mensaje: 'Demasiados intentos de inicio de sesión desde esta red. Intenta de nuevo más tarde.',
    key: ip,
  }),
  crearLimitador({
    ventanaMs: cfg.ventanaMs,
    max: cfg.loginCuentaIp,
    mensaje: 'Demasiados intentos fallidos. Intenta de nuevo más tarde.',
    key: (req) => `${ip(req)}|${correoDe(req)}`,
    skipSuccessfulRequests: true,
  }),
  crearLimitador({
    ventanaMs: cfg.ventanaMs,
    max: cfg.loginCuenta,
    mensaje: 'Esta cuenta recibió demasiados intentos fallidos. Intenta de nuevo más tarde.',
    key: correoDe,
    skipSuccessfulRequests: true,
  }),
];

module.exports = { globalLimiter, publicLimiter, registroLimiter, loginLimiters };
