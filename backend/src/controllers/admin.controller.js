// Panel de administración: resumen, usuarios, servicios, solicitudes, reseñas y auditoría. Solo rol admin.
// Toda acción que cambia algo exige un motivo y queda en la auditoría.
const { query, pool } = require('../config/db');
const { registrarAuditoria, motivoValido } = require('../utils/auditoria');

const ERROR_MOTIVO = { error: 'Escribe un motivo de entre 10 y 300 caracteres.' };
const nombreDe = (u) => `${u.nombre} ${u.apellido}`.trim();

// ── Resumen ──
exports.resumen = async (req, res, next) => {
  try {
    const semanas = [4, 8, 12].includes(Number(req.query.semanas)) ? Number(req.query.semanas) : 8;

    const [[roles], [servicios], [estados], [calif]] = await Promise.all([
      query('SELECT rol, COUNT(*) AS total FROM usuarios GROUP BY rol'),
      query('SELECT COUNT(*) AS total, COALESCE(SUM(disponible = 1), 0) AS disponibles FROM servicios'),
      query('SELECT estado, COUNT(*) AS total FROM solicitudes GROUP BY estado'),
      query('SELECT COUNT(*) AS total, AVG(puntuacion) AS media, COALESCE(SUM(puntuacion <= 2), 0) AS bajas FROM calificaciones WHERE oculta = 0'),
    ]);

    const usuarios = { cliente: 0, proveedor: 0, admin: 0 };
    for (const f of roles) usuarios[f.rol] = Number(f.total);
    const solicitudes = { pendiente: 0, aceptada: 0, en_proceso: 0, completada: 0, cancelada: 0 };
    for (const f of estados) solicitudes[f.estado] = Number(f.total);

    // Actividad por semana: la última semana es la más reciente.
    const dias = semanas * 7;
    const [[nuevosUsuarios], [nuevasSolicitudes]] = await Promise.all([
      query('SELECT FLOOR(TIMESTAMPDIFF(DAY, fecha_creacion, NOW()) / 7) AS w, COUNT(*) AS n FROM usuarios WHERE fecha_creacion >= NOW() - INTERVAL ? DAY GROUP BY w', [dias]),
      query('SELECT FLOOR(TIMESTAMPDIFF(DAY, fecha_solicitud, NOW()) / 7) AS w, COUNT(*) AS n FROM solicitudes WHERE fecha_solicitud >= NOW() - INTERVAL ? DAY GROUP BY w', [dias]),
    ]);
    const porSemana = [];
    for (let w = semanas - 1; w >= 0; w -= 1) {
      porSemana.push({
        hasta: new Date(Date.now() - w * 7 * 86400000).toISOString(),
        usuarios: Number(nuevosUsuarios.find((x) => Number(x.w) === w)?.n || 0),
        solicitudes: Number(nuevasSolicitudes.find((x) => Number(x.w) === w)?.n || 0),
      });
    }

    const [[suspendidos]] = await query('SELECT COUNT(*) AS n FROM usuarios WHERE activo = 0');
    const [[reportesNuevos]] = await query("SELECT COUNT(*) AS n FROM reportes WHERE estado = 'nuevo'");
    res.json({
      usuarios_por_rol: usuarios,
      servicios: { total: Number(servicios[0].total), disponibles: Number(servicios[0].disponibles) },
      solicitudes_por_estado: solicitudes,
      calificaciones: { total: Number(calif[0].total), media: calif[0].media ? Number(Number(calif[0].media).toFixed(1)) : 0 },
      semanas: porSemana,
      atencion: {
        solicitudes_pendientes: solicitudes.pendiente,
        servicios_no_disponibles: Number(servicios[0].total) - Number(servicios[0].disponibles),
        usuarios_suspendidos: Number(suspendidos.n),
        reportes_nuevos: Number(reportesNuevos.n),
        resenas_bajas: Number(calif[0].bajas),
      },
    });
  } catch (err) {
    return next(err);
  }
};

// ── Usuarios ──
exports.detalleUsuario = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [usuarios] = await query(
      'SELECT id, nombre, apellido, correo, telefono, rol, foto_url, direccion, oficio, activo, fecha_creacion FROM usuarios WHERE id = ?',
      [id]
    );
    if (usuarios.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const u = usuarios[0];

    const [[comoCliente]] = await query('SELECT COUNT(*) AS n FROM solicitudes WHERE cliente_id = ?', [id]);
    const [[comoProveedor]] = await query('SELECT COUNT(*) AS n FROM solicitudes WHERE proveedor_id = ?', [id]);
    const [[serv]] = await query('SELECT COUNT(*) AS n FROM servicios WHERE proveedor_id = ?', [id]);
    const [[cal]] = await query('SELECT COUNT(*) AS n, AVG(puntuacion) AS media FROM calificaciones WHERE proveedor_id = ? AND oculta = 0', [id]);
    const [ultimas] = await query(
      `SELECT sol.id, sol.estado, sol.fecha_solicitud, s.titulo AS servicio_titulo
         FROM solicitudes sol JOIN servicios s ON s.id = sol.servicio_id
        WHERE sol.cliente_id = ? OR sol.proveedor_id = ?
        ORDER BY sol.fecha_solicitud DESC LIMIT 5`,
      [id, id]
    );
    res.json({
      ...u,
      solicitudes_como_cliente: Number(comoCliente.n),
      solicitudes_como_proveedor: Number(comoProveedor.n),
      servicios: Number(serv.n),
      calificaciones_recibidas: Number(cal.n),
      calificacion_media: cal.media ? Number(Number(cal.media).toFixed(1)) : null,
      ultimas_solicitudes: ultimas,
    });
  } catch (err) {
    return next(err);
  }
};

// Suspender o reactivar una cuenta. Al suspender se cierran sus sesiones abiertas.
exports.cambiarEstadoUsuario = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const activo = req.body?.activo;
    if (typeof activo !== 'boolean') return res.status(400).json({ error: 'activo debe ser true o false' });
    const motivo = motivoValido(req.body?.motivo);
    if (!motivo) return res.status(400).json(ERROR_MOTIVO);
    if (id === req.usuarioId) return res.status(400).json({ error: 'No puedes suspender tu propia cuenta' });

    const [filas] = await query('SELECT id, nombre, apellido, correo, rol, activo FROM usuarios WHERE id = ?', [id]);
    if (filas.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const u = filas[0];
    // Igual que al eliminar: los administradores solo se gestionan desde el servidor.
    if (u.rol === 'admin') return res.status(403).json({ error: 'No se puede suspender a un administrador desde la API' });
    if (Boolean(u.activo) === activo) return res.status(409).json({ error: activo ? 'La cuenta ya está activa' : 'La cuenta ya está suspendida' });

    await query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
    if (!activo) await query('DELETE FROM tokens_sesion WHERE usuario_id = ?', [id]);
    await registrarAuditoria(req.usuarioId, 'usuario', activo ? 'Reactivó a' : 'Suspendió a', nombreDe(u), motivo);
    res.json({ mensaje: activo ? 'Cuenta reactivada' : 'Cuenta suspendida', activo });
  } catch (err) {
    return next(err);
  }
};

// ── Servicios ──
exports.listarServicios = async (req, res, next) => {
  try {
    const [servicios] = await query(
      `SELECT s.id, s.titulo, s.tarifa, s.tipo_tarifa, s.disponible, s.proveedor_id, c.nombre AS categoria_nombre,
              u.nombre AS proveedor_nombre, u.apellido AS proveedor_apellido
         FROM servicios s
         JOIN categorias c ON c.id = s.categoria_id
         JOIN usuarios u ON u.id = s.proveedor_id
        ORDER BY s.fecha_creacion DESC`
    );
    res.json(servicios);
  } catch (err) {
    return next(err);
  }
};

exports.cambiarDisponibilidadServicio = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const disponible = req.body?.disponible;
    if (typeof disponible !== 'boolean') return res.status(400).json({ error: 'disponible debe ser true o false' });
    const motivo = motivoValido(req.body?.motivo);
    if (!motivo) return res.status(400).json(ERROR_MOTIVO);

    const [filas] = await query('SELECT id, titulo FROM servicios WHERE id = ?', [id]);
    if (filas.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
    await query('UPDATE servicios SET disponible = ? WHERE id = ?', [disponible ? 1 : 0, id]);
    await registrarAuditoria(req.usuarioId, 'servicio', disponible ? 'Mostró el servicio' : 'Ocultó el servicio', filas[0].titulo, motivo);
    res.json({ mensaje: disponible ? 'Servicio visible' : 'Servicio oculto', disponible });
  } catch (err) {
    return next(err);
  }
};

// ── Solicitudes ──
exports.listarSolicitudes = async (req, res, next) => {
  try {
    const [solicitudes] = await query(
      `SELECT sol.id, sol.estado, sol.fecha_solicitud, sol.fecha_servicio, COALESCE(sol.tarifa_acordada, s.tarifa) AS tarifa,
              s.titulo AS servicio_titulo,
              cli.nombre AS cliente_nombre, cli.apellido AS cliente_apellido,
              prov.nombre AS proveedor_nombre, prov.apellido AS proveedor_apellido
         FROM solicitudes sol
         JOIN servicios s ON s.id = sol.servicio_id
         JOIN usuarios cli ON cli.id = sol.cliente_id
         JOIN usuarios prov ON prov.id = sol.proveedor_id
        ORDER BY sol.fecha_solicitud DESC`
    );
    res.json(solicitudes);
  } catch (err) {
    return next(err);
  }
};

// El administrador puede cerrar una solicitud que siga abierta (pendiente, aceptada o en proceso).
exports.cancelarSolicitud = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const motivo = motivoValido(req.body?.motivo);
    if (!motivo) return res.status(400).json(ERROR_MOTIVO);

    const [filas] = await query(
      `SELECT sol.id, sol.estado, sol.cliente_id, sol.proveedor_id, s.titulo FROM solicitudes sol JOIN servicios s ON s.id = sol.servicio_id WHERE sol.id = ?`,
      [id]
    );
    if (filas.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    const sol = filas[0];
    if (!['pendiente', 'aceptada', 'en_proceso'].includes(sol.estado)) {
      return res.status(409).json({ error: 'Solo se puede cancelar una solicitud que siga abierta' });
    }

    // El estado anterior va en el WHERE: si cambió mientras tanto, no se pisa.
    const [r] = await query("UPDATE solicitudes SET estado = 'cancelada' WHERE id = ? AND estado = ?", [id, sol.estado]);
    if (r.affectedRows === 0) return res.status(409).json({ error: 'La solicitud cambió de estado, vuelve a consultarla' });
    await query('INSERT INTO solicitud_historial (solicitud_id, estado_anterior, estado_nuevo, usuario_id) VALUES (?, ?, ?, ?)', [id, sol.estado, 'cancelada', req.usuarioId]);
    await query("UPDATE reprogramaciones SET estado = 'cancelada', fecha_respuesta = NOW() WHERE solicitud_id = ? AND estado = 'pendiente'", [id]);
    for (const destino of [sol.cliente_id, sol.proveedor_id]) {
      await query('INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)', [destino, `Un administrador canceló la solicitud de "${sol.titulo}". Motivo: ${motivo}`]).catch(() => {});
    }
    await registrarAuditoria(req.usuarioId, 'solicitud', 'Canceló la solicitud', `N.º ${id} · ${sol.titulo}`, motivo);
    res.json({ mensaje: 'Solicitud cancelada' });
  } catch (err) {
    return next(err);
  }
};

// ── Reseñas ──
exports.listarResenas = async (req, res, next) => {
  try {
    const [resenas] = await query(
      `SELECT cal.id, cal.puntuacion, cal.comentario, cal.oculta, cal.fecha_creacion,
              cli.nombre AS cliente_nombre, cli.apellido AS cliente_apellido,
              prov.nombre AS proveedor_nombre, prov.apellido AS proveedor_apellido
         FROM calificaciones cal
         JOIN usuarios cli ON cli.id = cal.cliente_id
         JOIN usuarios prov ON prov.id = cal.proveedor_id
        ORDER BY cal.fecha_creacion DESC`
    );
    res.json(resenas.map((r) => ({ ...r, oculta: Boolean(r.oculta) })));
  } catch (err) {
    return next(err);
  }
};

// Una reseña oculta no se muestra ni cuenta en la calificación del profesional; se puede restaurar.
exports.cambiarVisibilidadResena = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const oculta = req.body?.oculta;
    if (typeof oculta !== 'boolean') return res.status(400).json({ error: 'oculta debe ser true o false' });
    const motivo = motivoValido(req.body?.motivo);
    if (!motivo) return res.status(400).json(ERROR_MOTIVO);

    const [filas] = await query(
      `SELECT cal.id, prov.nombre, prov.apellido FROM calificaciones cal JOIN usuarios prov ON prov.id = cal.proveedor_id WHERE cal.id = ?`,
      [id]
    );
    if (filas.length === 0) return res.status(404).json({ error: 'Reseña no encontrada' });
    await query('UPDATE calificaciones SET oculta = ? WHERE id = ?', [oculta ? 1 : 0, id]);
    await registrarAuditoria(req.usuarioId, 'resena', oculta ? 'Ocultó una reseña de' : 'Restauró una reseña de', nombreDe(filas[0]), motivo);
    res.json({ mensaje: oculta ? 'Reseña oculta' : 'Reseña restaurada', oculta });
  } catch (err) {
    return next(err);
  }
};

// ── Reportes ──
exports.listarReportes = async (req, res, next) => {
  try {
    const [reportes] = await query(
      `SELECT r.id, r.motivo, r.detalle, r.estado, r.nota_admin, r.fecha, r.fecha_resolucion, r.solicitud_id,
              rep.nombre AS reportante_nombre, rep.apellido AS reportante_apellido,
              pro.id AS reportado_id, pro.nombre AS reportado_nombre, pro.apellido AS reportado_apellido, pro.activo AS reportado_activo,
              (SELECT COUNT(*) FROM reportes x WHERE x.reportado_id = r.reportado_id) AS total_contra_reportado
         FROM reportes r
         JOIN usuarios rep ON rep.id = r.reportante_id
         JOIN usuarios pro ON pro.id = r.reportado_id
        ORDER BY FIELD(r.estado, 'nuevo', 'revision', 'resuelto'), r.fecha DESC`
    );
    res.json(reportes.map((r) => ({ ...r, reportado_activo: Boolean(r.reportado_activo), total_contra_reportado: Number(r.total_contra_reportado) })));
  } catch (err) {
    return next(err);
  }
};

// Pasa un reporte a "en revisión" o lo resuelve (la nota de resolución es obligatoria).
exports.actualizarReporte = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const estado = req.body?.estado;
    if (!['revision', 'resuelto'].includes(estado)) return res.status(400).json({ error: "estado debe ser 'revision' o 'resuelto'" });
    const nota = estado === 'resuelto' ? motivoValido(req.body?.nota) : null;
    if (estado === 'resuelto' && !nota) return res.status(400).json({ error: 'Escribe una nota de resolución de entre 10 y 300 caracteres.' });

    const [filas] = await query(
      `SELECT r.id, r.estado, pro.nombre, pro.apellido FROM reportes r JOIN usuarios pro ON pro.id = r.reportado_id WHERE r.id = ?`,
      [id]
    );
    if (filas.length === 0) return res.status(404).json({ error: 'Reporte no encontrado' });
    if (filas[0].estado === 'resuelto') return res.status(409).json({ error: 'Este reporte ya está resuelto' });
    if (filas[0].estado === estado) return res.status(409).json({ error: 'El reporte ya está en ese estado' });

    await query(
      `UPDATE reportes SET estado = ?, atendido_por = ?, nota_admin = COALESCE(?, nota_admin),
              fecha_resolucion = ${estado === 'resuelto' ? 'NOW()' : 'NULL'} WHERE id = ?`,
      [estado, req.usuarioId, nota, id]
    );
    await registrarAuditoria(req.usuarioId, 'reporte', estado === 'resuelto' ? 'Resolvió un reporte contra' : 'Puso en revisión un reporte contra', nombreDe(filas[0]), nota);
    res.json({ mensaje: estado === 'resuelto' ? 'Reporte resuelto' : 'Reporte en revisión', estado });
  } catch (err) {
    return next(err);
  }
};

// ── Auditoría ──
const TIPOS_AUDITORIA = ['usuario', 'servicio', 'solicitud', 'resena', 'categoria', 'reporte'];
exports.listarAuditoria = async (req, res, next) => {
  try {
    const tipo = req.query.tipo;
    if (tipo !== undefined && !TIPOS_AUDITORIA.includes(tipo)) return res.status(400).json({ error: 'tipo no válido' });
    const [filas] = await query(
      `SELECT a.id, a.tipo, a.accion, a.objeto, a.motivo, a.fecha, u.nombre AS admin_nombre, u.apellido AS admin_apellido
         FROM auditoria a LEFT JOIN usuarios u ON u.id = a.admin_id
        ${tipo ? 'WHERE a.tipo = ?' : ''}
        ORDER BY a.fecha DESC, a.id DESC LIMIT 500`,
      tipo ? [tipo] : []
    );
    res.json(filas);
  } catch (err) {
    return next(err);
  }
};

void pool;
