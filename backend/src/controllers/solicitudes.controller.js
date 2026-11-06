const { query } = require('../config/db');
const resend = require('../config/resend');

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Zona horaria de fecha_servicio. Se guarda en UTC (la conexión usa time_zone +00:00) y se responde
// en ISO 8601 con "Z". Urbify opera en Colombia (UTC-5, sin horario de verano): un valor SIN zona
// (p. ej. "2026-12-01 10:00:00" de la app móvil) se interpreta como hora de Colombia, no como la
// hora del servidor. Un valor con zona ("...Z" o "...-05:00") se respeta tal cual.
const OFFSET_COLOMBIA = '-05:00';

function parsearFechaServicio(valor) {
  if (typeof valor !== 'string') return null;
  let texto = valor.trim().replace(' ', 'T');
  if (!texto) return null;
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(texto)) texto += OFFSET_COLOMBIA;
  const ms = Date.parse(texto);
  return Number.isNaN(ms) ? null : ms;
}

const aFechaMysqlUtc = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

exports.crearSolicitud = async (req, res, next) => {
  try {
    // proveedor_id ya no se recibe: se toma del servicio, así el cliente no puede
    // mezclar un servicio con un proveedor distinto.
    const { servicio_id, descripcion, fecha_servicio, direccion, latitud, longitud } = req.body;

    if (!servicio_id) {
      return res.status(400).json({ error: 'servicio_id es requerido' });
    }

    const fechaServicioMillis = parsearFechaServicio(fecha_servicio);
    if (fechaServicioMillis === null || fechaServicioMillis <= Date.now()) {
      return res.status(400).json({ error: 'Debes seleccionar una fecha y hora futura para el servicio' });
    }

    const [servicio] = await query('SELECT * FROM servicios WHERE id = ?', [servicio_id]);
    if (servicio.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    if (!servicio[0].disponible) {
      return res.status(400).json({ error: 'El servicio no está disponible' });
    }

    const proveedor_id = servicio[0].proveedor_id;

    if (req.usuarioId === proveedor_id) {
      return res.status(400).json({ error: 'No puedes solicitarte un servicio a ti mismo' });
    }

    const [proveedor] = await query(
      "SELECT id, nombre, apellido, correo FROM usuarios WHERE id = ? AND rol = 'proveedor' AND activo = 1",
      [proveedor_id]
    );
    if (proveedor.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const [cliente] = await query(
      'SELECT nombre, apellido, correo, direccion FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );

    // Se guarda la tarifa vigente al solicitar: un cambio posterior del servicio no altera el historial.
    const [result] = await query(
      `INSERT INTO solicitudes (cliente_id, proveedor_id, servicio_id, tarifa_acordada, tipo_tarifa_acordada, descripcion, fecha_servicio, direccion, latitud, longitud)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.usuarioId, proveedor_id, servicio_id, servicio[0].tarifa, servicio[0].tipo_tarifa, descripcion ?? null, aFechaMysqlUtc(fechaServicioMillis), direccion || null, latitud || null, longitud || null]
    );

    const solicitudId = result.insertId;

    // Crear notificación para el proveedor
    try {
      await query(
        'INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)',
        [
          proveedor_id,
          `Nueva solicitud de ${cliente[0].nombre} ${cliente[0].apellido} para el servicio "${servicio[0].titulo}"`
        ]
      );

      // Crear notificación de confirmación para el cliente
      await query(
        'INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)',
        [
          req.usuarioId,
          `Enviaste una solicitud a ${proveedor[0].nombre} ${proveedor[0].apellido} para el servicio "${servicio[0].titulo}"`
        ]
      );
    } catch (notifErr) {
      console.error('Error al guardar notificación en BD:', notifErr);
    }

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
          <p><strong>Fecha acordada:</strong> ${new Date(fechaServicioMillis).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} (hora de Colombia)</p>
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
    return next(err);
  }
};

exports.misSolicitudesComoCliente = async (req, res, next) => {
  try {
    const [solicitudes] = await query(
      `SELECT sol.*, s.titulo AS servicio_titulo, COALESCE(sol.tarifa_acordada, s.tarifa) AS tarifa,
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
    return next(err);
  }
};

exports.misSolicitudesComoProveedor = async (req, res, next) => {
  try {
    const [solicitudes] = await query(
      `SELECT sol.*, s.titulo AS servicio_titulo, COALESCE(sol.tarifa_acordada, s.tarifa) AS tarifa,
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
    return next(err);
  }
};

const transicionesValidas = {
  pendiente: ['aceptada', 'cancelada'],
  aceptada: ['en_proceso', 'cancelada'],
  en_proceso: ['completada'],
  completada: [],
  cancelada: [],
};

exports.actualizarEstadoSolicitud = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = Object.keys(transicionesValidas);
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const [solicitud] = await query(
      `SELECT sol.*,
              s.titulo AS servicio_titulo,
              prov.nombre AS prov_nombre, prov.apellido AS prov_apellido, prov.correo AS prov_correo,
              cli.nombre AS cli_nombre, cli.apellido AS cli_apellido, cli.correo AS cli_correo
       FROM solicitudes sol
       JOIN servicios s ON sol.servicio_id = s.id
       JOIN usuarios prov ON sol.proveedor_id = prov.id
       JOIN usuarios cli ON sol.cliente_id = cli.id
       WHERE sol.id = ?`,
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

    // El estado anterior va en el WHERE: si otra petición cambió la solicitud entre la
    // lectura y la escritura, la transición ya no es válida y no se aplica.
    const [actualizada] = await query(
      'UPDATE solicitudes SET estado = ? WHERE id = ? AND estado = ?',
      [estado, id, solicitudActual.estado]
    );
    if (actualizada.affectedRows === 0) {
      return res.status(409).json({ error: 'La solicitud cambió de estado, vuelve a consultarla' });
    }

    // Crear notificaciones en BD según el nuevo estado
    try {
      if (estado === 'aceptada') {
        await query(
          'INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)',
          [
            solicitudActual.cliente_id,
            `El proveedor ${solicitudActual.prov_nombre} ${solicitudActual.prov_apellido} aceptó tu solicitud para "${solicitudActual.servicio_titulo}"`
          ]
        );

        // Notificar por correo al cliente si es posible
        try {
          await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Urbify <notificaciones@urbify.app>',
            to: solicitudActual.cli_correo,
            subject: '¡Tu solicitud de servicio fue aceptada!',
            html: `
              <h2>¡Solicitud aceptada!</h2>
              <p>Hola ${escapeHtml(solicitudActual.cli_nombre)},</p>
              <p>El proveedor <strong>${escapeHtml(solicitudActual.prov_nombre)} ${escapeHtml(solicitudActual.prov_apellido)}</strong> ha aceptado tu solicitud para el servicio <strong>${escapeHtml(solicitudActual.servicio_titulo)}</strong>.</p>
              <hr>
              <p>Ingresa a Urbify para ver el estado de tu servicio.</p>
            `,
          });
        } catch (emailErr) {
          console.error('Error al enviar correo de aceptación:', emailErr.message);
        }
      } else if (estado === 'en_proceso') {
        await query(
          'INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)',
          [
            solicitudActual.cliente_id,
            `El proveedor ${solicitudActual.prov_nombre} inició el trabajo para "${solicitudActual.servicio_titulo}"`
          ]
        );
      } else if (estado === 'completada') {
        await query(
          'INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)',
          [
            solicitudActual.cliente_id,
            `El servicio "${solicitudActual.servicio_titulo}" fue completado por ${solicitudActual.prov_nombre}. ¡Ya puedes calificar su trabajo!`
          ]
        );
      } else if (estado === 'cancelada') {
        if (esProveedor) {
          await query(
            'INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)',
            [
              solicitudActual.cliente_id,
              `El proveedor ${solicitudActual.prov_nombre} canceló la solicitud para "${solicitudActual.servicio_titulo}"`
            ]
          );
        } else {
          await query(
            'INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)',
            [
              solicitudActual.proveedor_id,
              `El cliente ${solicitudActual.cli_nombre} canceló su solicitud para "${solicitudActual.servicio_titulo}"`
            ]
          );
        }
      }
    } catch (notifErr) {
      console.error('Error al crear notificación tras cambio de estado:', notifErr);
    }

    res.json({ mensaje: 'Estado actualizado exitosamente' });
  } catch (err) {
    return next(err);
  }
};

// Chat de la solicitud: solo lo ven y escriben el cliente y el proveedor de esa solicitud.
// 404 si no existe, 403 si el usuario no es parte de ella.
async function solicitudDelParticipante(id, usuarioId, res) {
  const [solicitudes] = await query('SELECT id, cliente_id, proveedor_id FROM solicitudes WHERE id = ?', [id]);
  const solicitud = solicitudes[0];
  if (!solicitud) {
    res.status(404).json({ error: 'Solicitud no encontrada' });
    return null;
  }
  if (solicitud.cliente_id !== usuarioId && solicitud.proveedor_id !== usuarioId) {
    res.status(403).json({ error: 'No autorizado para esta solicitud' });
    return null;
  }
  return solicitud;
}

exports.listarMensajes = async (req, res, next) => {
  try {
    const solicitud = await solicitudDelParticipante(req.params.id, req.usuarioId, res);
    if (!solicitud) return;

    const [mensajes] = await query(
      `SELECT m.id, m.solicitud_id, m.remitente_id, m.contenido, m.fecha_envio,
              u.nombre AS remitente_nombre, (m.remitente_id = ?) AS es_propio
       FROM mensajes_solicitud m
       JOIN usuarios u ON u.id = m.remitente_id
       WHERE m.solicitud_id = ?
       ORDER BY m.fecha_envio ASC, m.id ASC`,
      [req.usuarioId, solicitud.id]
    );
    res.json(mensajes);
  } catch (err) {
    return next(err);
  }
};

exports.enviarMensaje = async (req, res, next) => {
  try {
    const solicitud = await solicitudDelParticipante(req.params.id, req.usuarioId, res);
    if (!solicitud) return;

    const contenido = typeof req.body?.contenido === 'string' ? req.body.contenido.trim() : '';
    if (!contenido || contenido.length > 1000) {
      return res.status(400).json({ error: 'El mensaje debe tener entre 1 y 1000 caracteres' });
    }
    const [result] = await query(
      'INSERT INTO mensajes_solicitud (solicitud_id, remitente_id, contenido) VALUES (?, ?, ?)',
      [solicitud.id, req.usuarioId, contenido]
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Mensaje enviado' });
  } catch (err) {
    return next(err);
  }
};

exports.eliminarSolicitud = async (req, res, next) => {
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
    return next(err);
  }
};
