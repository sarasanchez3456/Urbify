const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
require('dotenv').config();

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
      // El rol y el estado de la cuenta se leen de la base de datos, no del token:
      // un cambio de rol o una cuenta desactivada surten efecto de inmediato.
      const [rows] = await query(
        `SELECT u.rol, u.activo
           FROM tokens_sesion t
           JOIN usuarios u ON u.id = t.usuario_id
          WHERE t.token = ? AND t.usuario_id = ? AND t.expira_en > NOW()`,
        [token, decoded.id]
      );
      if (rows.length === 0 || !rows[0].activo) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }
      req.usuarioRol = rows[0].rol;
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
    const [rows] = await query(
      `SELECT u.rol, u.activo
         FROM tokens_sesion t
         JOIN usuarios u ON u.id = t.usuario_id
        WHERE t.token = ? AND t.usuario_id = ? AND t.expira_en > NOW()`,
      [token, decoded.id]
    );
    if (rows.length > 0 && rows[0].activo) {
      req.usuarioId = decoded.id;
      req.usuarioRol = rows[0].rol;
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
