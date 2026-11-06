// Carga y valida la configuración al arrancar. Si falta algo obligatorio, el proceso termina
// con código 1 y un mensaje claro, en vez de arrancar con valores inseguros.
//
// NODE_ENV: development (por defecto) | staging | production | test
//   - development / test: se permiten valores por defecto para trabajar en local.
//   - staging / production: los secretos y la configuración son obligatorios.
// Los valores de los secretos nunca se imprimen.
const path = require('path');
const dotenv = require('dotenv');

const NODE_ENV = process.env.NODE_ENV || 'development';

// Un NODE_ENV desconocido (p. ej. "prod" o "Production") dejaría la validación estricta desactivada sin
// avisar, así que se rechaza. Se comprueba antes de leer los archivos .env.<entorno>.
const ENTORNOS = ['development', 'staging', 'production', 'test'];
if (!ENTORNOS.includes(NODE_ENV)) {
  console.error(`Configuración inválida: NODE_ENV="${NODE_ENV}" no es un entorno conocido.`);
  console.error(`Usa exactamente uno de: ${ENTORNOS.join(', ')} (en minúsculas).`);
  process.exit(1);
}

// Capas: .env.<entorno> (si existe) y luego .env. Las variables ya definidas en el
// proceso (Docker, la plataforma de despliegue) tienen prioridad sobre ambos archivos.
dotenv.config({ path: path.join(__dirname, '..', '..', `.env.${NODE_ENV}`) });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const ESTRICTO = NODE_ENV === 'production' || NODE_ENV === 'staging';

// Valores de ejemplo o históricos que no pueden usarse como secreto real.
const VALORES_CONOCIDOS = new Set([
  'cambia_este_secreto_en_produccion',
  'urbify_secret',
  'your_jwt_secret_key_change_in_production',
  'yourpassword',
  'changeme',
  'secret',
  'password',
]);

const MIN_JWT_SECRET = 32;
const errores = [];
const avisos = [];

function requerida(nombre) {
  const valor = (process.env[nombre] || '').trim();
  if (!valor) errores.push(`${nombre} es obligatoria en ${NODE_ENV}`);
  return valor;
}

function esValorConocido(valor) {
  return VALORES_CONOCIDOS.has(valor.toLowerCase());
}

function esLocal(url) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
}

function parsearOrigenes(lista) {
  const origenes = [];
  for (const crudo of lista.split(',').map((o) => o.trim()).filter(Boolean)) {
    if (crudo === '*') {
      errores.push('CORS_ORIGIN no puede ser "*": lista los orígenes permitidos separados por comas');
      continue;
    }
    let url;
    try {
      url = new URL(crudo);
    } catch {
      errores.push(`CORS_ORIGIN contiene un origen inválido: ${crudo}`);
      continue;
    }
    if (url.pathname !== '/' || url.search || url.hash) {
      errores.push(`CORS_ORIGIN debe contener solo orígenes (esquema://host[:puerto]), sin ruta: ${crudo}`);
      continue;
    }
    if (NODE_ENV === 'production' && url.protocol !== 'https:' && !esLocal(crudo)) {
      errores.push(`CORS_ORIGIN debe usar https en producción: ${crudo}`);
      continue;
    }
    origenes.push(url.origin);
  }
  return origenes;
}

// Entero decimal dentro de [min, max]. Valores como "abc", "1e3", "0x10", "-1" o fuera de rango se rechazan
// (y el proceso no arranca) en lugar de aceptarse o dejar la API inutilizable (p. ej. un límite de 0).
function entero(nombre, porDefecto, { min = 0, max = 2147483647 } = {}) {
  const crudo = process.env[nombre];
  if (crudo === undefined || crudo === '') return porDefecto;
  const n = /^\d+$/.test(crudo.trim()) ? Number(crudo.trim()) : NaN;
  if (!Number.isSafeInteger(n) || n < min || n > max) {
    errores.push(`${nombre} debe ser un entero entre ${min} y ${max}`);
    return porDefecto;
  }
  return n;
}

// Booleano estricto: solo "true" o "false" (un "True" o "1" no se interpreta en silencio como falso).
function booleano(nombre, porDefecto) {
  const crudo = process.env[nombre];
  if (crudo === undefined || crudo === '') return porDefecto;
  if (crudo !== 'true' && crudo !== 'false') {
    errores.push(`${nombre} debe ser "true" o "false"`);
    return porDefecto;
  }
  return crudo === 'true';
}

// Tamaño máximo del cuerpo JSON: número con unidad opcional (b, kb, mb), mayor que 0 y hasta 10 mb.
// body-parser acepta cualquier texto y, con uno inválido, desactiva el límite sin avisar.
function limiteDeCuerpo(nombre, porDefecto) {
  const crudo = (process.env[nombre] || '').trim();
  if (!crudo) return porDefecto;
  const m = /^(\d+(?:\.\d+)?)\s*(b|kb|mb)?$/i.exec(crudo);
  const bytes = m ? Number(m[1]) * { b: 1, kb: 1024, mb: 1024 * 1024 }[(m[2] || 'b').toLowerCase()] : NaN;
  if (!Number.isFinite(bytes) || bytes < 1 || bytes > 10 * 1024 * 1024) {
    errores.push(`${nombre} debe ser un tamaño válido entre 1b y 10mb (por ejemplo 100kb)`);
    return porDefecto;
  }
  return crudo;
}

// --- JWT -------------------------------------------------------------------
const jwtSecret = (process.env.JWT_SECRET || '').trim();
if (ESTRICTO) {
  if (!jwtSecret) {
    errores.push(`JWT_SECRET es obligatoria en ${NODE_ENV}`);
  } else if (esValorConocido(jwtSecret)) {
    errores.push('JWT_SECRET usa un valor de ejemplo conocido; genera uno aleatorio');
  } else if (jwtSecret.length < MIN_JWT_SECRET) {
    errores.push(`JWT_SECRET debe tener al menos ${MIN_JWT_SECRET} caracteres`);
  }
} else if (!jwtSecret) {
  avisos.push('JWT_SECRET no configurado: las rutas autenticadas fallarán');
}

// --- Base de datos ---------------------------------------------------------
const db = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  name: process.env.DB_NAME || 'urbify_db',
};
if (ESTRICTO) {
  requerida('DB_HOST');
  requerida('DB_USER');
  requerida('DB_NAME');
  const password = requerida('DB_PASSWORD');
  if (password && esValorConocido(password)) {
    errores.push('DB_PASSWORD usa un valor de ejemplo conocido');
  }
}

// --- CORS ------------------------------------------------------------------
let corsOrigenes;
if (ESTRICTO) {
  corsOrigenes = parsearOrigenes(requerida('CORS_ORIGIN'));
} else {
  corsOrigenes = parsearOrigenes(process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost');
}

// --- Correo ----------------------------------------------------------------
const emailFrom = (process.env.EMAIL_FROM || '').trim();
if (ESTRICTO) {
  requerida('EMAIL_FROM');
  if (!process.env.RESEND_API_KEY) avisos.push('RESEND_API_KEY no configurado: los correos no se enviarán');
}

// --- Rate limiting ---------------------------------------------------------
// Todos los límites son por ventana de RATE_LIMIT_WINDOW_SECONDS, salvo los marcados.
const rateLimit = {
  habilitado: booleano('RATE_LIMIT_ENABLED', true),
  // La ventana va de 1 s a ~24 días (límite de express-rate-limit: 2147483647 ms); 0 dejaría la API sin responder.
  ventanaMs: entero('RATE_LIMIT_WINDOW_SECONDS', 15 * 60, { min: 1, max: 2147483 }) * 1000,
  // Todas las rutas /api por IP.
  global: entero('RATE_LIMIT_GLOBAL', 1500, { min: 1 }),
  // Endpoints públicos de lectura (búsqueda, cercanos, destacados, stats...), por IP y por minuto.
  publico: entero('RATE_LIMIT_PUBLIC_PER_MINUTE', 120, { min: 1 }),
  // Registros por IP y por hora.
  registro: entero('RATE_LIMIT_REGISTER_PER_HOUR', 10, { min: 1 }),
  // Recuperación de contraseña: solicitudes de código por IP y por correo, y envíos de código por IP, por hora.
  recuperacionIp: entero('RATE_LIMIT_RECOVERY_IP_PER_HOUR', 10, { min: 1 }),
  recuperacionCorreo: entero('RATE_LIMIT_RECOVERY_EMAIL_PER_HOUR', 3, { min: 1 }),
  // Intentos de login (cualquier resultado) por IP.
  loginIp: entero('RATE_LIMIT_LOGIN_IP', 30, { min: 1 }),
  // Intentos fallidos contra una misma cuenta desde una misma IP.
  loginCuentaIp: entero('RATE_LIMIT_LOGIN_ACCOUNT_IP', 5, { min: 1 }),
  // Intentos fallidos contra una cuenta desde cualquier IP (tope contra ataques distribuidos).
  loginCuenta: entero('RATE_LIMIT_LOGIN_ACCOUNT', 20, { min: 1 }),
};

// --- Límites, proxy y HTTPS -------------------------------------------------
const config = {
  rateLimit,
  NODE_ENV,
  ESTRICTO,
  port: process.env.PORT || 4000,
  jwtSecret,
  db,
  corsOrigenes,
  emailFrom: emailFrom || 'Urbify <notificaciones@urbify.app>',
  bodyLimit: limiteDeCuerpo('BODY_LIMIT', '100kb'),
  // Número de proxys de confianza delante de la API (Nginx, balanceador). 0 = ninguno.
  trustProxy: entero('TRUST_PROXY', 0, { max: 10 }),
  // Redirige HTTP a HTTPS (requiere TRUST_PROXY para leer X-Forwarded-Proto).
  forceHttps: booleano('FORCE_HTTPS', false),
};

if (config.forceHttps && config.trustProxy === 0) {
  errores.push('FORCE_HTTPS=true requiere TRUST_PROXY >= 1 para detectar el protocolo original');
}

if (errores.length > 0) {
  console.error(`Configuración inválida para NODE_ENV=${NODE_ENV}:`);
  for (const e of errores) console.error(`  - ${e}`);
  console.error('Revisa backend/.env.example para ver las variables requeridas.');
  process.exit(1);
}
for (const a of avisos) console.warn(`Aviso de configuración: ${a}`);

module.exports = config;
