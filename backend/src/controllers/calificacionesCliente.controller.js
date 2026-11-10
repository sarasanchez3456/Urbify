// El profesional califica al cliente de una solicitud completada. Sirve para que otros profesionales sepan cómo
// es el cliente antes de aceptar; el cliente no ve estas calificaciones.
const { query } = require('../config/db');

exports.calificarCliente = async (req, res, next) => {
  try {
    const solicitudId = Number(req.body?.solicitud_id);
    const puntuacion = Number(req.body?.puntuacion);
    const comentario = typeof req.body?.comentario === 'string' ? req.body.comentario.trim() : '';

    if (!Number.isInteger(solicitudId) || solicitudId <= 0) return res.status(400).json({ error: 'solicitud_id no es válido' });
    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) return res.status(400).json({ error: 'La puntuación debe ser un número entero de 1 a 5' });
    if (comentario.length > 500) return res.status(400).json({ error: 'El comentario no puede pasar de 500 caracteres' });

    const [filas] = await query('SELECT id, cliente_id, proveedor_id, estado FROM solicitudes WHERE id = ?', [solicitudId]);
    // 404 también cuando la solicitud es de otro profesional, para no revelar que existe.
    if (filas.length === 0 || filas[0].proveedor_id !== req.usuarioId) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (filas[0].estado !== 'completada') return res.status(400).json({ error: 'Solo puedes calificar al cliente cuando el servicio está completado' });

    try {
      await query(
        'INSERT INTO calificaciones_cliente (solicitud_id, proveedor_id, cliente_id, puntuacion, comentario) VALUES (?, ?, ?, ?, ?)',
        [solicitudId, req.usuarioId, filas[0].cliente_id, puntuacion, comentario || null]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya calificaste a este cliente en esta solicitud' });
      throw err;
    }
    res.status(201).json({ mensaje: 'Calificación enviada' });
  } catch (err) {
    return next(err);
  }
};
