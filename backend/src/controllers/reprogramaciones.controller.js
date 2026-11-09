// Reprogramar una cita: el cliente propone una nueva fecha entre las horas libres del profesional y el profesional
// la acepta o la rechaza. Mientras está pendiente, la hora propuesta queda reservada (ver utils/agenda.js).
const { query } = require('../config/db');
const { conReservaDeProveedor, motivoNoDisponible, parsearFecha, aFechaMysqlUtc } = require('../utils/agenda');

const ESTADOS_QUE_SE_PUEDEN_REPROGRAMAR = ['pendiente', 'aceptada'];

const fechaTexto = (valor) =>
  new Date(valor).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });

const notificar = async (usuarioId, mensaje) => {
  try {
    await query('INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)', [usuarioId, mensaje]);
  } catch (err) {
    console.error('Error al guardar notificación de reprogramación:', err.message);
  }
};

// 404 si no existe, 403 si el usuario no participa en la solicitud.
async function solicitudDelParticipante(id, usuarioId, res) {
  const [filas] = await query(
    `SELECT sol.id, sol.cliente_id, sol.proveedor_id, sol.estado, sol.fecha_servicio, s.titulo AS servicio_titulo,
            cli.nombre AS cli_nombre, prov.nombre AS prov_nombre
       FROM solicitudes sol
       JOIN servicios s ON s.id = sol.servicio_id
       JOIN usuarios cli ON cli.id = sol.cliente_id
       JOIN usuarios prov ON prov.id = sol.proveedor_id
      WHERE sol.id = ?`,
    [id]
  );
  const solicitud = filas[0];
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

exports.listarReprogramaciones = async (req, res, next) => {
  try {
    const solicitud = await solicitudDelParticipante(req.params.id, req.usuarioId, res);
    if (!solicitud) return;
    const [filas] = await query(
      `SELECT id, solicitud_id, solicitado_por, fecha_actual, fecha_propuesta, estado, fecha_creacion, fecha_respuesta
         FROM reprogramaciones WHERE solicitud_id = ? ORDER BY id DESC`,
      [solicitud.id]
    );
    res.json(filas);
  } catch (err) {
    return next(err);
  }
};

exports.crearReprogramacion = async (req, res, next) => {
  try {
    const solicitud = await solicitudDelParticipante(req.params.id, req.usuarioId, res);
    if (!solicitud) return;

    if (solicitud.cliente_id !== req.usuarioId) {
      return res.status(403).json({ error: 'Solo el cliente puede pedir cambiar la fecha' });
    }
    if (!ESTADOS_QUE_SE_PUEDEN_REPROGRAMAR.includes(solicitud.estado)) {
      return res.status(400).json({ error: 'Solo se puede reprogramar una solicitud pendiente o aceptada' });
    }

    const propuestaMs = parsearFecha(req.body && req.body.fecha_propuesta);
    if (propuestaMs === null || propuestaMs <= Date.now()) {
      return res.status(400).json({ error: 'Debes elegir una fecha y hora futura' });
    }
    if (solicitud.fecha_servicio && new Date(solicitud.fecha_servicio).getTime() === propuestaMs) {
      return res.status(400).json({ error: 'Esa ya es la fecha de tu cita. Elige otra hora.' });
    }

    const resultado = await conReservaDeProveedor(solicitud.proveedor_id, async (conn) => {
      // Se vuelve a leer dentro del bloqueo: el estado pudo cambiar mientras el cliente elegía la hora.
      const [[actual]] = await conn.execute('SELECT estado, fecha_servicio FROM solicitudes WHERE id = ? FOR UPDATE', [solicitud.id]);
      if (!ESTADOS_QUE_SE_PUEDEN_REPROGRAMAR.includes(actual.estado)) {
        return { error: { status: 409, mensaje: 'La solicitud cambió de estado, vuelve a consultarla' } };
      }
      const [pendientes] = await conn.execute("SELECT id FROM reprogramaciones WHERE solicitud_id = ? AND estado = 'pendiente'", [solicitud.id]);
      if (pendientes.length > 0) {
        return { error: { status: 409, mensaje: 'Ya tienes un cambio de fecha esperando respuesta. Cancélalo para pedir otro.', codigo: 'ya_pendiente' } };
      }
      const motivo = await motivoNoDisponible(conn, solicitud.proveedor_id, propuestaMs, solicitud.id);
      if (motivo) return { error: { status: 409, mensaje: motivo.mensaje, codigo: motivo.codigo } };

      const [ins] = await conn.execute(
        'INSERT INTO reprogramaciones (solicitud_id, solicitado_por, fecha_actual, fecha_propuesta) VALUES (?, ?, ?, ?)',
        [solicitud.id, req.usuarioId, aFechaMysqlUtc(new Date(actual.fecha_servicio).getTime()), aFechaMysqlUtc(propuestaMs)]
      );
      return { id: ins.insertId };
    });
    if (resultado.error) {
      return res.status(resultado.error.status).json({ error: resultado.error.mensaje, codigo: resultado.error.codigo });
    }

    await notificar(
      solicitud.proveedor_id,
      `${solicitud.cli_nombre} quiere cambiar la cita de "${solicitud.servicio_titulo}" al ${fechaTexto(propuestaMs)}. Acéptalo o recházalo en Mis Solicitudes.`
    );
    res.status(201).json({ mensaje: 'Pedido de cambio de fecha enviado', reprogramacion: { id: resultado.id } });
  } catch (err) {
    return next(err);
  }
};

// accion: 'aceptar' | 'rechazar' (el profesional) o 'cancelar' (quien lo pidió).
exports.responderReprogramacion = async (req, res, next) => {
  try {
    const solicitud = await solicitudDelParticipante(req.params.id, req.usuarioId, res);
    if (!solicitud) return;

    const accion = req.body && req.body.accion;
    if (!['aceptar', 'rechazar', 'cancelar'].includes(accion)) {
      return res.status(400).json({ error: "accion debe ser 'aceptar', 'rechazar' o 'cancelar'" });
    }
    const esProveedor = solicitud.proveedor_id === req.usuarioId;
    if (accion === 'cancelar' ? esProveedor : !esProveedor) {
      return res.status(403).json({
        error: accion === 'cancelar' ? 'Solo quien pidió el cambio puede cancelarlo' : 'Solo el profesional puede aceptar o rechazar el cambio',
      });
    }

    const reprogId = Number(req.params.rid);
    if (!Number.isInteger(reprogId) || reprogId <= 0) return res.status(404).json({ error: 'Pedido de cambio no encontrado' });
    const nuevoEstado = { aceptar: 'aceptada', rechazar: 'rechazada', cancelar: 'cancelada' }[accion];

    const resultado = await conReservaDeProveedor(solicitud.proveedor_id, async (conn) => {
      const [filas] = await conn.execute('SELECT * FROM reprogramaciones WHERE id = ? AND solicitud_id = ? FOR UPDATE', [reprogId, solicitud.id]);
      const reprog = filas[0];
      if (!reprog) return { error: { status: 404, mensaje: 'Pedido de cambio no encontrado' } };
      if (reprog.estado !== 'pendiente') return { error: { status: 409, mensaje: 'Este pedido ya fue respondido o cancelado' } };

      if (accion === 'aceptar') {
        const [[actual]] = await conn.execute('SELECT estado FROM solicitudes WHERE id = ? FOR UPDATE', [solicitud.id]);
        if (!ESTADOS_QUE_SE_PUEDEN_REPROGRAMAR.includes(actual.estado)) {
          return { error: { status: 409, mensaje: 'La solicitud ya no admite cambios de fecha' } };
        }
        // La hora estaba reservada por este pedido; solo se vuelve a revisar que ninguna otra cita haya quedado encima.
        const motivo = await motivoNoDisponible(conn, solicitud.proveedor_id, new Date(reprog.fecha_propuesta).getTime(), solicitud.id);
        if (motivo && motivo.codigo === 'ocupado') return { error: { status: 409, mensaje: motivo.mensaje, codigo: motivo.codigo } };
        await conn.execute('UPDATE solicitudes SET fecha_servicio = ? WHERE id = ?', [aFechaMysqlUtc(new Date(reprog.fecha_propuesta).getTime()), solicitud.id]);
      }
      await conn.execute('UPDATE reprogramaciones SET estado = ?, fecha_respuesta = NOW() WHERE id = ?', [nuevoEstado, reprog.id]);
      return { reprog };
    });
    if (resultado.error) {
      return res.status(resultado.error.status).json({ error: resultado.error.mensaje, codigo: resultado.error.codigo });
    }

    const fecha = fechaTexto(resultado.reprog.fecha_propuesta);
    if (accion === 'aceptar') {
      await notificar(solicitud.cliente_id, `${solicitud.prov_nombre} aceptó cambiar tu cita de "${solicitud.servicio_titulo}" al ${fecha}.`);
    } else if (accion === 'rechazar') {
      await notificar(solicitud.cliente_id, `${solicitud.prov_nombre} no puede el ${fecha} para "${solicitud.servicio_titulo}". Tu cita sigue en la fecha anterior; puedes proponer otra hora.`);
    } else {
      await notificar(solicitud.proveedor_id, `${solicitud.cli_nombre} canceló su pedido de cambiar la cita de "${solicitud.servicio_titulo}".`);
    }
    res.json({ mensaje: 'Listo', estado: nuevoEstado });
  } catch (err) {
    return next(err);
  }
};
