const { query } = require('../config/db');
const resend = require('../config/resend');
require('dotenv').config();

exports.crearSolicitud = async (req, res) => {
  try {
    const { proveedor_id, servicio_id, descripcion, fecha_servicio } = req.body;

    const [proveedor] = await query(
      'SELECT id, nombre, apellido, correo FROM usuarios WHERE id = ? AND rol = "proveedor" AND activo = 1',
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

    try {
      await resend.emails.send({
        from: 'Urbify <notificaciones@urbify.app>',
        to: proveedor[0].correo,
        subject: 'Tienes una nueva solicitud de servicio',
        html: `
          <h2>Nueva solicitud de servicio</h2>
          <p><strong>Cliente:</strong> ${cliente[0].nombre} ${cliente[0].apellido}</p>
          <p><strong>Correo:</strong> ${cliente[0].correo}</p>
          <p><strong>Dirección:</strong> ${cliente[0].direccion || 'No especificada'}</p>
          <p><strong>Servicio solicitado:</strong> ${servicio[0].titulo}</p>
          <p><strong>Descripción:</strong> ${descripcion || 'Sin descripción'}</p>
          <p><strong>Fecha acordada:</strong> ${fecha_servicio ? new Date(fecha_servicio).toLocaleDateString() : 'Por acordar'}</p>
          <hr>
          <p>Ingresa a tu panel de Urbify para gestionar esta solicitud.</p>
        `,
      });

      await resend.emails.send({
        from: 'Urbify <notificaciones@urbify.app>',
        to: cliente[0].correo,
        subject: 'Tu solicitud de servicio fue enviada con éxito',
        html: `
          <h2>Solicitud enviada exitosamente</h2>
          <p>Hola ${cliente[0].nombre},</p>
          <p>Tu solicitud de servicio para <strong>${servicio[0].titulo}</strong> ha sido enviada a ${proveedor[0].nombre} ${proveedor[0].apellido}.</p>
          <p>El proveedor se pondrá en contacto contigo pronto.</p>
          <hr>
          <p>Gracias por usar Urbify.</p>
        `,
      });

      await query('UPDATE solicitudes SET correo_enviado = 1 WHERE id = ?', [solicitudId]);
    } catch (emailErr) {
      console.error('Error al enviar correo:', emailErr);
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

exports.actualizarEstadoSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['pendiente', 'aceptada', 'en_proceso', 'completada', 'cancelada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const [solicitud] = await query(
      'SELECT * FROM solicitudes WHERE id = ? AND proveedor_id = ?',
      [id, req.usuarioId]
    );
    if (solicitud.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada o no autorizada' });
    }

    await query('UPDATE solicitudes SET estado = ? WHERE id = ?', [estado, id]);
    res.json({ mensaje: 'Estado actualizado exitosamente' });
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
};
