const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
require('dotenv').config();

// La sesión y la base son la autoridad: el JWT solo identifica la sesión y
// nunca decide permisos. El modo vive en la SESIÓN (tokens_sesion.modo_activo):
// cada dispositivo puede estar en un modo distinto y cambiar de modo en uno no
// cierra los demás. De la cuenta solo se lee la capacidad (es_proveedor): una
// sesión en modo proveedor deja de valer si la cuenta pierde esa capacidad.
// usuarios.modo_activo es el modo con el que empieza el próximo inicio de sesión.
const leerSesion = async (token, usuarioId) => {
  const [rows] = await query(
    `SELECT u.rol, u.activo, u.es_proveedor, t.modo_activo AS modo_sesion
       FROM tokens_sesion t
       JOIN usuarios u ON u.id = t.usuario_id
      WHERE t.token = ? AND t.usuario_id = ? AND t.expira_en > NOW()`,
    [token, usuarioId]
  );
  const sesion = rows[0];
  if (!sesion || !sesion.activo) return null;
  const esAdmin = sesion.rol === 'admin';
  const modoValido = esAdmin
    ? sesion.modo_sesion === null
    : ['cliente', 'proveedor'].includes(sesion.modo_sesion)
      && (sesion.modo_sesion !== 'proveedor' || Boolean(sesion.es_proveedor));
  if (!modoValido) return null;
  return { rol: esAdmin ? 'admin' : sesion.modo_sesion, modo: sesion.modo_sesion };
};

const authenticate = async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET no configurado');
    return res.status(500).json({ error: 'Error de configuración del servidor' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = decoded.id;
    req.token = token;

    try {
      const sesion = await leerSesion(token, decoded.id);
      if (!sesion) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }
      req.usuarioRol = sesion.rol;
      req.usuarioModo = sesion.modo;
    } catch (dbErr) {
      console.error('Error al verificar token en DB:', dbErr);
      return res.status(500).json({ error: 'Error al verificar sesión' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Autenticación opcional para rutas públicas que muestran más datos con sesión. Con un token válido fija
// req.usuarioId y req.usuarioRol (leídos de la BD, igual que authenticate); sin token, con un token inválido,
// vencido, revocado o de una cuenta desactivada, la petición sigue como anónima: nunca responde 401.
const authenticateOptional = async (req, res, next) => {
  req.usuarioRol = undefined;
  const authHeader = req.headers.authorization;
  if (!process.env.JWT_SECRET || !authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const sesion = await leerSesion(token, decoded.id);
    if (sesion) {
      req.usuarioId = decoded.id;
      req.usuarioRol = sesion.rol;
      req.usuarioModo = sesion.modo;
      req.token = token;
    }
  } catch (err) {
    // token inválido/vencido o BD no disponible: se trata como anónimo
  }
  return next();
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuarioRol)) {
    return res.status(403).json({ error: 'No tienes permisos para esta acción' });
  }
  next();
};

module.exports = { authenticate, authenticateOptional, authorize };
