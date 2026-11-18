const { query } = require('../config/db');
const { enviarCorreo } = require('../utils/correo');
const { escapeHtml } = require('../utils/html');
const { motivosDeColumna } = require('../utils/motivosCalificacion');
const { errorDeDireccion } = require('../utils/direccion');
const { conReservaDeProveedor, motivoNoDisponible, parsearFecha, aFechaMysqlUtc } = require('../utils/agenda');
const { registrarHistorial } = require('../utils/historial');
const { sqlSoloConContacto } = require('../utils/privacidad');
const { codigoInicioObligatorio } = require('../config/env');
const {
  MAX_INTENTOS, nuevaSal, derivarCodigo, codigoCorrecto, normalizarCodigo, sinDatosDeCodigo,
} = require('../utils/codigoInicio');

exports.crearSolicitud = async (req, res, next) => {
  try {
    // proveedor_id ya no se recibe: se toma del servicio, así el cliente no puede
    // mezclar un servicio con un proveedor distinto.
    const { servicio_id, descripcion, fecha_servicio, direccion, latitud, longitud } = req.body;

    if (!servicio_id) {
      return res.status(400).json({ error: 'servicio_id es requerido' });
    }

    const fechaServicioMillis = parsearFecha(fecha_servicio);
    if (fechaServicioMillis === null || fechaServicioMillis <= Date.now()) {
      return res.status(400).json({ error: 'Debes seleccionar una fecha y hora futura para el servicio' });
    }

    // Dirección del servicio: si viene, debe ser un texto razonable (no solo espacios, no símbolos raros).
    const errorDir = errorDeDireccion(direccion);
    if (errorDir) return res.status(400).json({ error: errorDir });

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
      'SELECT id, nombre, apellido, correo FROM usuarios WHERE id = ? AND es_proveedor = 1 AND activo = 1',
      [proveedor_id]
    );
    if (proveedor.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const [cliente] = await query(
      'SELECT nombre, apellido, correo, direccion FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );

    // La reserva se hace en una transacción que bloquea al proveedor: si dos clientes piden la misma hora a la vez,
    // el segundo ve la hora ocupada y recibe 409 (el proveedor nunca queda con dos citas a la misma hora).
    // Se guarda la tarifa vigente al solicitar: un cambio posterior del servicio no altera el historial.
    const reserva = await conReservaDeProveedor(proveedor_id, async (conn) => {
      const motivo = await motivoNoDisponible(conn, proveedor_id, fechaServicioMillis);
      if (motivo) return { motivo };
      const [result] = await conn.execute(
        `INSERT INTO solicitudes (cliente_id, proveedor_id, servicio_id, tarifa_acordada, tipo_tarifa_acordada, descripcion, fecha_servicio, direccion, latitud, longitud)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.usuarioId, proveedor_id, servicio_id, servicio[0].tarifa, servicio[0].tipo_tarifa, descripcion ?? null, aFechaMysqlUtc(fechaServicioMillis), direccion || null, latitud || null, longitud || null]
      );
      // El primer registro del historial (null -> pendiente) va en la misma transacción que la solicitud:
      // si falla, la solicitud tampoco se crea.
      await registrarHistorial(conn, result.insertId, null, 'pendiente', req.usuarioId);
      return { id: result.insertId };
    });
    if (reserva.motivo) {
      return res.status(409).json({ error: reserva.motivo.mensaje, codigo: reserva.motivo.codigo });
    }

    const solicitudId = reserva.id;

    // Crear notificación para el proveedor
    try {
      await query(
        "INSERT INTO notificaciones (tipo, solicitud_id, usuario_id, modo, mensaje) VALUES ('solicitud', ?, ?, ?, ?)",
        [solicitudId,
          proveedor_id,
          'proveedor',
          `Nueva solicitud de ${cliente[0].nombre} ${cliente[0].apellido} para el servicio "${servicio[0].titulo}"`
        ]
      );

      // Crear notificación de confirmación para el cliente
      await query(
        "INSERT INTO notificaciones (tipo, solicitud_id, usuario_id, modo, mensaje) VALUES ('solicitud', ?, ?, ?, ?)",
        [solicitudId,
          req.usuarioId,
          'cliente',
          `Enviaste una solicitud a ${proveedor[0].nombre} ${proveedor[0].apellido} para el servicio "${servicio[0].titulo}"`
        ]
      );
    } catch (notifErr) {
      console.error('Error al guardar notificación en BD:', notifErr);
    }

    let emailOk = true;

    try {
      await enviarCorreo({
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
      await enviarCorreo({
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
       u.nombre AS proveedor_nombre, u.apellido AS proveedor_apellido, u.foto_url AS proveedor_foto,
       ${sqlSoloConContacto('u.telefono')} AS proveedor_telefono, s.categoria_id AS servicio_categoria_id,
       (SELECT cal.puntuacion FROM calificaciones cal WHERE cal.solicitud_id = sol.id) AS calificacion_puntuacion,
       (SELECT cal.motivos FROM calificaciones cal WHERE cal.solicitud_id = sol.id) AS calificacion_motivos,
       (SELECT r.id FROM reprogramaciones r WHERE r.solicitud_id = sol.id AND r.estado = 'pendiente' LIMIT 1) AS reprogramacion_id,
       (SELECT r.fecha_propuesta FROM reprogramaciones r WHERE r.solicitud_id = sol.id AND r.estado = 'pendiente' LIMIT 1) AS reprogramacion_fecha,
       (SELECT rep.id FROM reportes rep WHERE rep.solicitud_id = sol.id AND rep.reportante_id = sol.cliente_id LIMIT 1) AS reporte_id
       FROM solicitudes sol
       JOIN servicios s ON sol.servicio_id = s.id
       JOIN usuarios u ON sol.proveedor_id = u.id
       WHERE sol.cliente_id = ?
       ORDER BY sol.fecha_solicitud DESC`,
      [req.usuarioId]
    );
    res.json(solicitudes.map((s) => ({ ...sinDatosDeCodigo(s), calificacion_motivos: motivosDeColumna(s.calificacion_motivos) })));
  } catch (err) {
    return next(err);
  }
};

exports.misSolicitudesComoProveedor = async (req, res, next) => {
  try {
    const [solicitudes] = await query(
      `SELECT sol.*, s.titulo AS servicio_titulo, COALESCE(sol.tarifa_acordada, s.tarifa) AS tarifa,
       u.nombre AS cliente_nombre, u.apellido AS cliente_apellido, u.foto_url AS cliente_foto,
       ${sqlSoloConContacto('u.direccion')} AS cliente_direccion, ${sqlSoloConContacto('u.telefono')} AS cliente_telefono,
       (SELECT cc.puntuacion FROM calificaciones_cliente cc WHERE cc.solicitud_id = sol.id) AS cliente_calificado,
       (SELECT AVG(cc.puntuacion) FROM calificaciones_cliente cc WHERE cc.cliente_id = sol.cliente_id) AS cliente_promedio,
       (SELECT COUNT(*) FROM calificaciones_cliente cc WHERE cc.cliente_id = sol.cliente_id) AS cliente_total_calificaciones,
       (SELECT r.id FROM reprogramaciones r WHERE r.solicitud_id = sol.id AND r.estado = 'pendiente' LIMIT 1) AS reprogramacion_id,
       (SELECT r.fecha_propuesta FROM reprogramaciones r WHERE r.solicitud_id = sol.id AND r.estado = 'pendiente' LIMIT 1) AS reprogramacion_fecha
       FROM solicitudes sol
       JOIN servicios s ON sol.servicio_id = s.id
       JOIN usuarios u ON sol.cliente_id = u.id
       WHERE sol.proveedor_id = ?
       ORDER BY sol.fecha_solicitud DESC`,
      [req.usuarioId]
    );
    // El proveedor nunca recibe la sal ni los intentos del código de inicio (aunque sin la clave no sirvan de nada).
    // `codigo_inicio_obligatorio` le dice a la web si al iniciar debe pedir el código al proveedor.
    res.json(solicitudes.map((s) => ({ ...sinDatosDeCodigo(s), codigo_inicio_obligatorio: codigoInicioObligatorio })));
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

    if (esProveedor && req.usuarioRol !== 'proveedor') {
      return res.status(403).json({ error: 'Debes operar como proveedor para gestionar esta solicitud' });
    }
    if (esCliente && req.usuarioRol !== 'cliente') {
      return res.status(403).json({ error: 'Debes operar como cliente para gestionar esta solicitud' });
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

    // El cambio de estado, su registro en el historial y la cancelación de un pedido de cambio de fecha pendiente
    // forman un solo cambio: van en una transacción (si algo falla, la solicitud conserva su estado anterior).
    // Se usa el mismo bloqueo por proveedor que las reservas y reprogramaciones, así un cambio de estado y la
    // respuesta a un cambio de fecha de la misma solicitud se atienden uno detrás de otro (sin bloqueos cruzados).
    // El estado anterior va en el WHERE: si otra petición cambió la solicitud entre la lectura y la escritura, la
    // transición ya no es válida y no se aplica.
    // Iniciar el servicio exige el código que el cliente le dice al proveedor al llegar (issue #57).
    const pideCodigo = estado === 'en_proceso' && codigoInicioObligatorio;
    const codigo = pideCodigo ? normalizarCodigo(req.body.codigo) : '';
    if (pideCodigo && !codigo) {
      return res.status(400).json({ error: 'Escribe el código de inicio que te da el cliente', codigo: 'codigo_inicio_requerido' });
    }

    const resultado = await conReservaDeProveedor(solicitudActual.proveedor_id, async (conn) => {
      if (pideCodigo) {
        // El código se comprueba dentro de la misma transacción que el cambio de estado y con la fila bloqueada: dos
        // intentos simultáneos se atienden uno detrás de otro y cada fallo cuenta (no se pueden probar códigos en paralelo).
        const [[fila]] = await conn.execute(
          'SELECT estado, codigo_inicio_sal, codigo_inicio_intentos FROM solicitudes WHERE id = ? FOR UPDATE',
          [id]
        );
        if (!fila || fila.estado !== solicitudActual.estado) return { aplicado: false };
        if (fila.codigo_inicio_intentos >= MAX_INTENTOS) return { codigo: 'bloqueado' };
        if (!codigoCorrecto(id, fila.codigo_inicio_sal, codigo)) {
          const intentos = fila.codigo_inicio_intentos + 1;
          // El fallo se guarda (la transacción se confirma igual): así cuenta aunque el proveedor no vuelva a intentar.
          await conn.execute('UPDATE solicitudes SET codigo_inicio_intentos = ? WHERE id = ?', [intentos, id]);
          return { codigo: intentos >= MAX_INTENTOS ? 'recien_bloqueado' : 'incorrecto', restantes: MAX_INTENTOS - intentos };
        }
      }

      // Al aceptar se genera la sal del código de inicio (y se reinician los intentos).
      const [actualizada] = estado === 'aceptada'
        ? await conn.execute(
          'UPDATE solicitudes SET estado = ?, codigo_inicio_sal = ?, codigo_inicio_intentos = 0 WHERE id = ? AND estado = ?',
          [estado, nuevaSal(), id, solicitudActual.estado]
        )
        : await conn.execute(
          'UPDATE solicitudes SET estado = ? WHERE id = ? AND estado = ?',
          [estado, id, solicitudActual.estado]
        );
      if (actualizada.affectedRows === 0) return { aplicado: false };

      await registrarHistorial(conn, Number(id), solicitudActual.estado, estado, req.usuarioId);

      // Un pedido de cambio de fecha pendiente deja de tener sentido cuando la solicitud empieza o termina.
      if (['en_proceso', 'completada', 'cancelada'].includes(estado)) {
        await conn.execute("UPDATE reprogramaciones SET estado = 'cancelada', fecha_respuesta = NOW() WHERE solicitud_id = ? AND estado = 'pendiente'", [id]);
      }
      return { aplicado: true };
    });

    if (resultado.codigo === 'incorrecto') {
      return res.status(400).json({
        error: `El código de inicio no es correcto. Te quedan ${resultado.restantes} intento${resultado.restantes === 1 ? '' : 's'}.`,
        codigo: 'codigo_inicio_incorrecto',
        intentos_restantes: resultado.restantes,
      });
    }
    if (resultado.codigo === 'bloqueado' || resultado.codigo === 'recien_bloqueado') {
      if (resultado.codigo === 'recien_bloqueado') {
        // Se avisa al cliente una sola vez, cuando se bloquea: debe generar un código nuevo desde su solicitud.
        await query(
          "INSERT INTO notificaciones (tipo, solicitud_id, usuario_id, modo, mensaje) VALUES ('solicitud', ?, ?, 'cliente', ?)",
          [solicitudActual.id, solicitudActual.cliente_id,
            `Se bloqueó el código de inicio de "${solicitudActual.servicio_titulo}" por demasiados intentos. Si el proveedor ya llegó, genera un código nuevo desde Mis Solicitudes.`]
        ).catch((e) => console.error('Error al avisar del código bloqueado:', e));
      }
      return res.status(400).json({
        error: 'El código de inicio se bloqueó por demasiados intentos. Pide al cliente que genere uno nuevo.',
        codigo: 'codigo_inicio_bloqueado',
        intentos_restantes: 0,
      });
    }
    if (!resultado.aplicado) {
      return res.status(409).json({ error: 'La solicitud cambió de estado, vuelve a consultarla' });
    }

    // Crear notificaciones en BD según el nuevo estado
    try {
      if (estado === 'aceptada') {
        await query(
          "INSERT INTO notificaciones (tipo, solicitud_id, usuario_id, modo, mensaje) VALUES ('solicitud', ?, ?, ?, ?)",
          [solicitudActual.id,
            solicitudActual.cliente_id,
            'cliente',
            `El proveedor ${solicitudActual.prov_nombre} ${solicitudActual.prov_apellido} aceptó tu solicitud para "${solicitudActual.servicio_titulo}"`
          ]
        );

        // Notificar por correo al cliente si es posible
        try {
          await enviarCorreo({
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
          "INSERT INTO notificaciones (tipo, solicitud_id, usuario_id, modo, mensaje) VALUES ('solicitud', ?, ?, ?, ?)",
          [solicitudActual.id,
            solicitudActual.cliente_id,
            'cliente',
            `El proveedor ${solicitudActual.prov_nombre} inició el trabajo para "${solicitudActual.servicio_titulo}"`
          ]
        );
      } else if (estado === 'completada') {
        await query(
          "INSERT INTO notificaciones (tipo, solicitud_id, usuario_id, modo, mensaje) VALUES ('solicitud', ?, ?, ?, ?)",
          [solicitudActual.id,
            solicitudActual.cliente_id,
            'cliente',
            `El servicio "${solicitudActual.servicio_titulo}" fue completado por ${solicitudActual.prov_nombre}. ¡Ya puedes calificar su trabajo!`
          ]
        );
      } else if (estado === 'cancelada') {
        if (esProveedor) {
          await query(
            "INSERT INTO notificaciones (tipo, solicitud_id, usuario_id, modo, mensaje) VALUES ('solicitud', ?, ?, ?, ?)",
            [solicitudActual.id,
              solicitudActual.cliente_id,
              'cliente',
              `El proveedor ${solicitudActual.prov_nombre} canceló la solicitud para "${solicitudActual.servicio_titulo}"`
            ]
          );
        } else {
          await query(
            "INSERT INTO notificaciones (tipo, solicitud_id, usuario_id, modo, mensaje) VALUES ('solicitud', ?, ?, ?, ?)",
            [solicitudActual.id,
              solicitudActual.proveedor_id,
              'proveedor',
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
async function solicitudDelParticipante(id, usuarioId, usuarioRol, res) {
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
  if ((solicitud.cliente_id === usuarioId && usuarioRol !== 'cliente') || (solicitud.proveedor_id === usuarioId && usuarioRol !== 'proveedor')) {
    res.status(403).json({ error: 'Debes usar el modo correspondiente a esta solicitud' });
    return null;
  }
  return solicitud;
}

exports.listarMensajes = async (req, res, next) => {
  try {
    const solicitud = await solicitudDelParticipante(req.params.id, req.usuarioId, req.usuarioRol, res);
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
    const solicitud = await solicitudDelParticipante(req.params.id, req.usuarioId, req.usuarioRol, res);
    if (!solicitud) return;

    const contenido = typeof req.body?.contenido === 'string' ? req.body.contenido.trim() : '';
    if (!contenido || contenido.length > 1000) {
      return res.status(400).json({ error: 'El mensaje debe tener entre 1 y 1000 caracteres' });
    }
    const [result] = await query(
      'INSERT INTO mensajes_solicitud (solicitud_id, remitente_id, contenido) VALUES (?, ?, ?)',
      [solicitud.id, req.usuarioId, contenido]
    );

    // Aviso a la otra parte: aparece en su campana de notificaciones. Si falla, el mensaje ya quedó guardado.
    try {
      const destinatarioId = solicitud.cliente_id === req.usuarioId ? solicitud.proveedor_id : solicitud.cliente_id;
      const [datos] = await query(
        `SELECT u.nombre, u.apellido, s.titulo
           FROM usuarios u
           JOIN solicitudes sol ON sol.id = ?
           JOIN servicios s ON s.id = sol.servicio_id
          WHERE u.id = ?`,
        [solicitud.id, req.usuarioId]
      );
      if (datos.length > 0) {
        const { nombre, apellido, titulo } = datos[0];
        const vistaPrevia = contenido.length > 80 ? `${contenido.slice(0, 80).trimEnd()}…` : contenido;
        await query('INSERT INTO notificaciones (usuario_id, modo, tipo, solicitud_id, mensaje) VALUES (?, ?, ?, ?, ?)', [
          destinatarioId,
          destinatarioId === solicitud.cliente_id ? 'cliente' : 'proveedor',
          'mensaje',
          solicitud.id,
          `${solicitud.proveedor_id === req.usuarioId ? 'El proveedor' : 'El cliente'} ${nombre} ${apellido} te envió un mensaje sobre "${titulo}": "${vistaPrevia}"`,
        ]);
      }
    } catch (notifErr) {
      console.error('Error al guardar la notificación del mensaje:', notifErr);
    }

    res.status(201).json({ id: result.insertId, mensaje: 'Mensaje enviado' });
  } catch (err) {
    return next(err);
  }
};

// Historial de estados de la solicitud (cuándo se creó, aceptó, inició...). Solo lo ven el cliente y el proveedor.
exports.listarHistorial = async (req, res, next) => {
  try {
    const solicitud = await solicitudDelParticipante(req.params.id, req.usuarioId, req.usuarioRol, res);
    if (!solicitud) return;

    const [historial] = await query(
      `SELECT estado_anterior, estado_nuevo, fecha
         FROM solicitud_historial
        WHERE solicitud_id = ?
        ORDER BY fecha ASC, id ASC`,
      [solicitud.id]
    );
    res.json(historial);
  } catch (err) {
    return next(err);
  }
};

// ── Código de inicio del servicio (issue #57) ──
// Solo el CLIENTE de la solicitud, en modo cliente y mientras la solicitud está aceptada, puede ver o renovar su código.
// El proveedor nunca puede consultarlo: lo recibe de palabra del cliente cuando llega.
async function solicitudDelClienteAceptada(req, res) {
  const solicitud = await solicitudDelParticipante(req.params.id, req.usuarioId, req.usuarioRol, res);
  if (!solicitud) return null;
  if (solicitud.cliente_id !== req.usuarioId) {
    res.status(403).json({ error: 'Solo el cliente de la solicitud puede ver su código de inicio' });
    return null;
  }
  const [[fila]] = await query('SELECT estado, codigo_inicio_sal, codigo_inicio_intentos FROM solicitudes WHERE id = ?', [solicitud.id]);
  if (fila.estado !== 'aceptada') {
    res.status(409).json({ error: 'El código de inicio solo está disponible mientras la solicitud está aceptada', codigo: 'codigo_inicio_no_disponible' });
    return null;
  }
  return { id: solicitud.id, ...fila };
}

const respuestaCodigo = (id, sal, intentos) => ({
  codigo: derivarCodigo(id, sal),
  intentos_restantes: Math.max(0, MAX_INTENTOS - intentos),
  bloqueado: intentos >= MAX_INTENTOS,
  obligatorio: codigoInicioObligatorio,
});

exports.verCodigoInicio = async (req, res, next) => {
  try {
    const s = await solicitudDelClienteAceptada(req, res);
    if (!s) return;
    let sal = s.codigo_inicio_sal;
    if (!sal) {
      // Solicitudes aceptadas antes de existir esta función: la sal se crea la primera vez que el cliente la pide.
      // `IS NULL` en el WHERE: si dos pestañas la piden a la vez, ambas terminan mostrando la misma.
      await query("UPDATE solicitudes SET codigo_inicio_sal = ? WHERE id = ? AND estado = 'aceptada' AND codigo_inicio_sal IS NULL", [nuevaSal(), s.id]);
      [[{ codigo_inicio_sal: sal }]] = await query('SELECT codigo_inicio_sal FROM solicitudes WHERE id = ?', [s.id]);
    }
    res.set('Cache-Control', 'no-store');
    res.json(respuestaCodigo(s.id, sal, s.codigo_inicio_intentos));
  } catch (err) {
    return next(err);
  }
};

// Genera un código nuevo (el anterior deja de servir) y reinicia los intentos: para cuando se bloqueó o el cliente
// cree que alguien más lo vio.
exports.renovarCodigoInicio = async (req, res, next) => {
  try {
    const s = await solicitudDelClienteAceptada(req, res);
    if (!s) return;
    const sal = nuevaSal();
    const [r] = await query(
      "UPDATE solicitudes SET codigo_inicio_sal = ?, codigo_inicio_intentos = 0 WHERE id = ? AND estado = 'aceptada'",
      [sal, s.id]
    );
    if (r.affectedRows === 0) {
      return res.status(409).json({ error: 'La solicitud cambió de estado, vuelve a consultarla' });
    }
    res.set('Cache-Control', 'no-store');
    res.json(respuestaCodigo(s.id, sal, 0));
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
    if ((s.cliente_id === req.usuarioId && req.usuarioRol !== 'cliente') || (s.proveedor_id === req.usuarioId && req.usuarioRol !== 'proveedor')) {
      return res.status(403).json({ error: 'Debes usar el modo correspondiente a esta solicitud' });
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
