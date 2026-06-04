const { query } = require('../config/db');
const resend = require('../config/resend');

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

exports.crearSolicitud = async (req, res) => {
  try {
    const { proveedor_id, servicio_id, descripcion, fecha_servicio } = req.body;

    if (req.usuarioId === Number(proveedor_id)) {
      return res.status(400).json({ error: 'No puedes solicitarte un servicio a ti mismo' });
    }

    const [proveedor] = await query(
      "SELECT id, nombre, apellido, correo FROM usuarios WHERE id = ? AND rol = 'proveedor' AND activo = 1",
      [proveedor_id]
    );
    if (proveedor.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const [servicio] = await query('SELECT * FROM servicios WHERE id = ? AND proveedor_id = ?', [servicio_id, proveedor_id]);
    if (servicio.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const [cliente] = await query(
      'SELECT nombre, apellido, correo, direccion FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );

    const [result] = await query(
      `INSERT INTO solicitudes (cliente_id, proveedor_id, servicio_id, descripcion, fecha_servicio)
       OUTPUT INSERTED.id
       VALUES (?, ?, ?, ?, ?)`,
      [req.usuarioId, proveedor_id, servicio_id, descripcion, fecha_servicio || null]
    );

    const solicitudId = result[0].id;

    let emailOk = true;

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Urbify <notificaciones@urbify.app>',
        to: proveedor[0].correo,
        subject: 'Tienes una nueva solicitud de servicio',
        html: `
          <h2>Nueva solicitud de servicio</h2>
          <p><strong>Cliente:</strong> ${escapeHtml(cliente[0].nombre)} ${escapeHtml(cliente[0].apellido)}</p>
          <p><strong>Correo:</strong> ${escapeHtml(cliente[0].correo)}</p>
          <p><strong>Dirección:</strong> ${escapeHtml(cliente[0].direccion) || 'No especificada'}</p>
          <p><strong>Servicio solicitado:</strong> ${escapeHtml(servicio[0].titulo)}</p>
          <p><strong>Descripción:</strong> ${escapeHtml(descripcion) || 'Sin descripción'}</p>
          <p><strong>Fecha acordada:</strong> ${fecha_servicio && !isNaN(new Date(fecha_servicio).getTime()) ? new Date(fecha_servicio).toLocaleDateString() : 'Por acordar'}</p>
          <hr>
          <p>Ingresa a tu panel de Urbify para gestionar esta solicitud.</p>
        `,
      });
    } catch (emailErr) {
      console.error('Error al enviar correo al proveedor:', emailErr);
      emailOk = false;
    }

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Urbify <notificaciones@urbify.app>',
        to: cliente[0].correo,
        subject: 'Tu solicitud de servicio fue enviada con éxito',
        html: `
          <h2>Solicitud enviada exitosamente</h2>
          <p>Hola ${escapeHtml(cliente[0].nombre)},</p>
          <p>Tu solicitud de servicio para <strong>${escapeHtml(servicio[0].titulo)}</strong> ha sido enviada a ${escapeHtml(proveedor[0].nombre)} ${escapeHtml(proveedor[0].apellido)}.</p>
          <p>El proveedor se pondrá en contacto contigo pronto.</p>
          <hr>
          <p>Gracias por usar Urbify.</p>
        `,
      });
    } catch (emailErr) {
      console.error('Error al enviar correo al cliente:', emailErr);
      emailOk = false;
    }

    if (emailOk) {
      await query('UPDATE solicitudes SET correo_enviado = 1 WHERE id = ?', [solicitudId]);
    }

    res.status(201).json({
      mensaje: 'Solicitud creada exitosamente',
      solicitud: { id: solicitudId },
    });
  } catch (err) {
    console.error('Error al crear solicitud:', err);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
};

exports.misSolicitudesComoCliente = async (req, res) => {
  try {
    const [solicitudes] = await query(
      `SELECT sol.*, s.titulo AS servicio_titulo, s.tarifa,
       u.nombre AS proveedor_nombre, u.apellido AS proveedor_apellido, u.foto_url AS proveedor_foto
       FROM solicitudes sol
       JOIN servicios s ON sol.servicio_id = s.id
       JOIN usuarios u ON sol.proveedor_id = u.id
       WHERE sol.cliente_id = ?
       ORDER BY sol.fecha_solicitud DESC`,
      [req.usuarioId]
    );
    res.json(solicitudes);
  } catch (err) {
    console.error('Error al obtener solicitudes:', err);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

exports.misSolicitudesComoProveedor = async (req, res) => {
  try {
    const [solicitudes] = await query(
      `SELECT sol.*, s.titulo AS servicio_titulo, s.tarifa,
       u.nombre AS cliente_nombre, u.apellido AS cliente_apellido, u.foto_url AS cliente_foto,
       u.direccion AS cliente_direccion, u.telefono AS cliente_telefono
       FROM solicitudes sol
       JOIN servicios s ON sol.servicio_id = s.id
       JOIN usuarios u ON sol.cliente_id = u.id
       WHERE sol.proveedor_id = ?
       ORDER BY sol.fecha_solicitud DESC`,
      [req.usuarioId]
    );
    res.json(solicitudes);
  } catch (err) {
    console.error('Error al obtener solicitudes:', err);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

const transicionesValidas = {
  pendiente: ['aceptada', 'cancelada'],
  aceptada: ['en_proceso', 'cancelada'],
  en_proceso: ['completada'],
  completada: [],
  cancelada: [],
};

exports.actualizarEstadoSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = Object.keys(transicionesValidas);
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const [solicitud] = await query(
      'SELECT * FROM solicitudes WHERE id = ?',
      [id]
    );
    if (solicitud.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const solicitudActual = solicitud[0];

    const esProveedor = solicitudActual.proveedor_id === req.usuarioId;
    const esCliente = solicitudActual.cliente_id === req.usuarioId;

    if (!esProveedor && !esCliente) {
      return res.status(403).json({ error: 'No autorizado para esta solicitud' });
    }

    if (esCliente && estado !== 'cancelada') {
      return res.status(403).json({ error: 'Como cliente solo puedes cancelar la solicitud' });
    }

    if (esCliente && solicitudActual.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Solo puedes cancelar solicitudes en estado pendiente' });
    }

    const transicionesPermitidas = transicionesValidas[solicitudActual.estado];
    if (!transicionesPermitidas.includes(estado)) {
      return res.status(400).json({
        error: `No se puede cambiar de "${solicitudActual.estado}" a "${estado}". Transiciones permitidas: ${transicionesPermitidas.join(', ') || 'ninguna'}`,
      });
    }

    await query('UPDATE solicitudes SET estado = ? WHERE id = ?', [estado, id]);
    res.json({ mensaje: 'Estado actualizado exitosamente' });
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
};

exports.eliminarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const [solicitud] = await query('SELECT * FROM solicitudes WHERE id = ?', [id]);
    if (solicitud.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const s = solicitud[0];
    if (s.cliente_id !== req.usuarioId && s.proveedor_id !== req.usuarioId) {
      return res.status(403).json({ error: 'No autorizado para eliminar esta solicitud' });
    }
    if (s.estado !== 'cancelada' && s.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Solo se pueden eliminar solicitudes en estado pendiente o cancelada' });
    }
    await query('DELETE FROM solicitudes WHERE id = ?', [id]);
    res.json({ mensaje: 'Solicitud eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar solicitud:', err);
    res.status(500).json({ error: 'Error al eliminar solicitud' });
  }
};
