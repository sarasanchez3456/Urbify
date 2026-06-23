const { query } = require('../config/db');

exports.listarNotificaciones = async (req, res) => {
  try {
    const [notificaciones] = await query(
      'SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY fecha_creacion DESC',
      [req.usuarioId]
    );
    res.json(notificaciones);
  } catch (err) {
    console.error('Error al listar notificaciones:', err);
    res.status(500).json({ error: 'Error al listar notificaciones' });
  }
};

exports.crearNotificacion = async (req, res) => {
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
    console.error('Error al crear notificación:', err);
    res.status(500).json({ error: 'Error al crear notificación' });
  }
};

exports.marcarLeida = async (req, res) => {
  try {
    const { id } = req.params;
    const [existe] = await query(
      'SELECT id FROM notificaciones WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    await query('UPDATE notificaciones SET leida = 1 WHERE id = ?', [id]);
    res.json({ mensaje: 'Notificación marcada como leída' });
  } catch (err) {
    console.error('Error al marcar notificación:', err);
    res.status(500).json({ error: 'Error al marcar notificación' });
  }
};

exports.eliminarNotificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const [existe] = await query(
      'SELECT id FROM notificaciones WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    await query('DELETE FROM notificaciones WHERE id = ?', [id]);
    res.json({ mensaje: 'Notificación eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar notificación:', err);
    res.status(500).json({ error: 'Error al eliminar notificación' });
  }
};
