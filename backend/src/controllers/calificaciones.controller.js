const { query } = require('../config/db');

const puntuacionValida = (p) => Number.isInteger(p) && p >= 1 && p <= 5;

exports.crearCalificacion = async (req, res) => {
  try {
    const { solicitud_id, puntuacion, comentario } = req.body;

    if (!puntuacionValida(puntuacion)) {
      return res.status(400).json({ error: 'La puntuación debe ser un entero entre 1 y 5' });
    }
    if (!solicitud_id) {
      return res.status(400).json({ error: 'solicitud_id es requerido' });
    }

    const [solicitud] = await query('SELECT cliente_id, proveedor_id, estado FROM solicitudes WHERE id = ?', [solicitud_id]);
    if (solicitud.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    if (solicitud[0].cliente_id !== req.usuarioId) {
      return res.status(403).json({ error: 'Solo el cliente de la solicitud puede calificarla' });
    }
    if (solicitud[0].estado !== 'completada') {
      return res.status(400).json({ error: 'Solo se pueden calificar solicitudes completadas' });
    }

    const [existente] = await query('SELECT id FROM calificaciones WHERE solicitud_id = ?', [solicitud_id]);
    if (existente.length > 0) {
      return res.status(409).json({ error: 'Esta solicitud ya ha sido calificada' });
    }

    let result;
    try {
      [result] = await query(
        `INSERT INTO calificaciones (solicitud_id, cliente_id, proveedor_id, puntuacion, comentario)
         VALUES (?, ?, ?, ?, ?)`,
        [solicitud_id, req.usuarioId, solicitud[0].proveedor_id, puntuacion, comentario || null]
      );
    } catch (dupErr) {
      // UNIQUE(solicitud_id): dos peticiones simultáneas no pueden calificar dos veces.
      if (dupErr.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Esta solicitud ya ha sido calificada' });
      }
      throw dupErr;
    }

    res.status(201).json({
      mensaje: 'Calificación creada exitosamente',
      calificacion: { id: result.insertId },
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
      `SELECT cal.puntuacion, cal.comentario, cal.fecha_creacion,
       u.nombre, u.apellido, u.foto_url, s.titulo AS servicio_titulo
       FROM calificaciones cal
       JOIN usuarios u ON cal.cliente_id = u.id
       JOIN solicitudes sol ON cal.solicitud_id = sol.id
       JOIN servicios s ON sol.servicio_id = s.id
       WHERE cal.proveedor_id = ?
       ORDER BY cal.fecha_creacion DESC`,
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
    if (puntuacion !== undefined && puntuacion !== null && !puntuacionValida(puntuacion)) {
      return res.status(400).json({ error: 'La puntuación debe ser un entero entre 1 y 5' });
    }
    const [existe] = await query('SELECT cliente_id FROM calificaciones WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Calificación no encontrada' });
    }
    if (existe[0].cliente_id !== req.usuarioId) {
      return res.status(403).json({ error: 'No autorizado para modificar esta calificación' });
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
    const [existe] = await query('SELECT cliente_id FROM calificaciones WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Calificación no encontrada' });
    }
    if (existe[0].cliente_id !== req.usuarioId) {
      return res.status(403).json({ error: 'No autorizado para eliminar esta calificación' });
    }
    await query('DELETE FROM calificaciones WHERE id = ?', [id]);
    res.json({ mensaje: 'Calificación eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar calificación:', err);
    res.status(500).json({ error: 'Error al eliminar calificación' });
  }
};
