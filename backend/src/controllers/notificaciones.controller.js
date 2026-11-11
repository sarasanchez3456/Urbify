const { query } = require('../config/db');

exports.listarNotificaciones = async (req, res, next) => {
  try {
    const [notificaciones] = await query(
      `SELECT id, usuario_id, tipo, solicitud_id, mensaje, leida, fecha_creacion
       FROM notificaciones
       WHERE usuario_id = ?
       ORDER BY fecha_creacion DESC`,
      [req.usuarioId]
    );
    res.json(notificaciones);
  } catch (err) {
    return next(err);
  }
};

exports.crearNotificacion = async (req, res, next) => {
  try {
    const { usuario_id, mensaje } = req.body;
    if (!usuario_id || !mensaje) {
      return res.status(400).json({ error: 'usuario_id y mensaje son requeridos' });
    }
    if (Number(usuario_id) !== req.usuarioId) {
      return res.status(403).json({ error: 'Solo puedes crear notificaciones para ti mismo' });
    }
    const [result] = await query(
      'INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)',
      [usuario_id, mensaje]
    );
    res.status(201).json({ mensaje: 'Notificación creada exitosamente', id: result.insertId });
  } catch (err) {
    return next(err);
  }
};

exports.marcarLeida = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existe] = await query('SELECT usuario_id FROM notificaciones WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    if (existe[0].usuario_id !== req.usuarioId) {
      return res.status(403).json({ error: 'No autorizado para esta notificación' });
    }
    await query('UPDATE notificaciones SET leida = 1 WHERE id = ?', [id]);
    res.json({ mensaje: 'Notificación marcada como leída' });
  } catch (err) {
    return next(err);
  }
};

exports.marcarTodasLeidas = async (req, res, next) => {
  try {
    await query('UPDATE notificaciones SET leida = 1 WHERE usuario_id = ?', [req.usuarioId]);
    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas' });
  } catch (err) {
    return next(err);
  }
};

exports.eliminarNotificacion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existe] = await query('SELECT usuario_id FROM notificaciones WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    if (existe[0].usuario_id !== req.usuarioId) {
      return res.status(403).json({ error: 'No autorizado para esta notificación' });
    }
    await query('DELETE FROM notificaciones WHERE id = ?', [id]);
    res.json({ mensaje: 'Notificación eliminada exitosamente' });
  } catch (err) {
    return next(err);
  }
};

exports.limpiarTodas = async (req, res, next) => {
  try {
    await query('DELETE FROM notificaciones WHERE usuario_id = ?', [req.usuarioId]);
    res.json({ mensaje: 'Todas las notificaciones eliminadas' });
  } catch (err) {
    return next(err);
  }
};
