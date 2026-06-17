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
    req.usuarioRol = decoded.rol;

    try {
      const [rows] = await query(
        'SELECT id FROM tokens_sesion WHERE token = ? AND usuario_id = ? AND expira_en > GETDATE()',
        [token, decoded.id]
      );
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }
    } catch (dbErr) {
      console.error('Error al verificar token en DB:', dbErr);
      return res.status(500).json({ error: 'Error al verificar sesión' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuarioRol)) {
    return res.status(403).json({ error: 'No tienes permisos para esta acción' });
  }
  next();
};

module.exports = { authenticate, authorize };
