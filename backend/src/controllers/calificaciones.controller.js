const { query } = require('../config/db');

exports.crearCalificacion = async (req, res) => {
  try {
    const { solicitud_id, puntuacion, comentario } = req.body;

    if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
      return res.status(400).json({ error: 'La puntuación debe ser entre 1 y 5' });
    }

    const [solicitud] = await query(
      "SELECT * FROM solicitudes WHERE id = ? AND cliente_id = ? AND estado = 'completada'",
      [solicitud_id, req.usuarioId]
    );
    if (solicitud.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada, no autorizada o no completada' });
    }

    const [existente] = await query('SELECT id FROM calificaciones WHERE solicitud_id = ?', [solicitud_id]);
    if (existente.length > 0) {
      return res.status(400).json({ error: 'Esta solicitud ya ha sido calificada' });
    }

    const [result] = await query(
      `INSERT INTO calificaciones (solicitud_id, cliente_id, proveedor_id, puntuacion, comentario)
       OUTPUT INSERTED.id
       VALUES (?, ?, ?, ?, ?)`,
      [solicitud_id, req.usuarioId, solicitud[0].proveedor_id, puntuacion, comentario || null]
    );

    res.status(201).json({
      mensaje: 'Calificación creada exitosamente',
      calificacion: { id: result[0].id },
    });
  } catch (err) {
    console.error('Error al crear calificación:', err);
    res.status(500).json({ error: 'Error al crear calificación' });
  }
};

exports.calificacionesProveedor = async (req, res) => {
  try {
    const { proveedor_id } = req.params;

    const [calificaciones] = await query(
      `SELECT cal.puntuacion, cal.comentario, cal.creado_en,
       u.nombre, u.apellido, u.foto_url, s.titulo AS servicio_titulo
       FROM calificaciones cal
       JOIN usuarios u ON cal.cliente_id = u.id
       JOIN solicitudes sol ON cal.solicitud_id = sol.id
       JOIN servicios s ON sol.servicio_id = s.id
       WHERE cal.proveedor_id = ?
       ORDER BY cal.creado_en DESC`,
      [proveedor_id]
    );

    const [promedio] = await query(
      `SELECT COALESCE(AVG(puntuacion), 0) AS promedio, COUNT(*) AS total
       FROM calificaciones WHERE proveedor_id = ?`,
      [proveedor_id]
    );

    res.json({ calificaciones, ...promedio[0] });
  } catch (err) {
    console.error('Error al obtener calificaciones:', err);
    res.status(500).json({ error: 'Error al obtener calificaciones' });
  }
};

exports.actualizarCalificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { puntuacion, comentario } = req.body;
    if (puntuacion && (puntuacion < 1 || puntuacion > 5)) {
      return res.status(400).json({ error: 'La puntuación debe ser entre 1 y 5' });
    }
    const [existe] = await query('SELECT * FROM calificaciones WHERE id = ? AND cliente_id = ?', [id, req.usuarioId]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Calificación no encontrada o no autorizada' });
    }
    await query(
      'UPDATE calificaciones SET puntuacion = COALESCE(?, puntuacion), comentario = COALESCE(?, comentario) WHERE id = ?',
      [puntuacion || null, comentario || null, id]
    );
    res.json({ mensaje: 'Calificación actualizada exitosamente' });
  } catch (err) {
    console.error('Error al actualizar calificación:', err);
    res.status(500).json({ error: 'Error al actualizar calificación' });
  }
};

exports.eliminarCalificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const [existe] = await query('SELECT * FROM calificaciones WHERE id = ? AND cliente_id = ?', [id, req.usuarioId]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Calificación no encontrada o no autorizada' });
    }
    await query('DELETE FROM calificaciones WHERE id = ?', [id]);
    res.json({ mensaje: 'Calificación eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar calificación:', err);
    res.status(500).json({ error: 'Error al eliminar calificación' });
  }
};
