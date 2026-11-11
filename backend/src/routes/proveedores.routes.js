const router = require('express').Router();
const { query, pool } = require('../config/db');
const { publicLimiter } = require('../middleware/rateLimit');
const { authenticate, authenticateOptional, authorize } = require('../middleware/auth');
const { leerDisponibilidad, construirAgenda, fechaLocal, textoAMinutos, DURACION_MIN } = require('../utils/agenda');
const { veContactoExacto, protegerContacto } = require('../utils/privacidad');

// Número decimal estricto ("6.25", "-75.5"): rechaza Infinity, NaN, notación científica, arrays (lat[]=1) y basura.
const DECIMAL = /^-?\d+(\.\d+)?$/;
const numero = (v) => (typeof v === 'string' && DECIMAL.test(v.trim()) ? Number(v) : NaN);

router.get('/cercanos', publicLimiter, authenticateOptional, async (req, res, next) => {
  try {
    const { lat, lng, radio = '5' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitud y longitud son requeridas' });
    }

    const latNum = numero(lat);
    const lngNum = numero(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ error: 'Latitud y longitud deben ser números válidos' });
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ error: 'Latitud debe estar entre -90 y 90 y longitud entre -180 y 180' });
    }

    const radioKm = numero(radio);
    if (!Number.isFinite(radioKm) || radioKm <= 0) {
      return res.status(400).json({ error: 'radio debe ser un número positivo' });
    }

    const [proveedores] = await query(
      `SELECT sub.* FROM (
        SELECT u.id, u.nombre, u.apellido, u.foto_url, u.direccion, u.latitud, u.longitud, u.telefono,
         COALESCE(cal_stats.promedio, 0) AS calificacion_promedio,
         COALESCE(cal_stats.total, 0) AS total_calificaciones,
         (6371 * ACOS(
           LEAST(1, GREATEST(-1,
             COS(RADIANS(?)) * COS(RADIANS(u.latitud)) *
             COS(RADIANS(u.longitud) - RADIANS(?)) +
             SIN(RADIANS(?)) * SIN(RADIANS(u.latitud))
           ))
         )) AS distancia_km
        FROM usuarios u
        LEFT JOIN (
          SELECT cal.proveedor_id, AVG(cal.puntuacion) AS promedio, COUNT(cal.id) AS total
          FROM calificaciones cal WHERE cal.oculta = 0
          GROUP BY cal.proveedor_id
        ) cal_stats ON cal_stats.proveedor_id = u.id
        WHERE u.rol = 'proveedor' AND u.activo = 1
        AND u.latitud IS NOT NULL AND u.longitud IS NOT NULL
      ) sub
      WHERE sub.distancia_km <= ?
      ORDER BY sub.distancia_km ASC`,
      [latNum, lngNum, latNum, radioKm]
    );

    if (proveedores.length > 0) {
      const ids = proveedores.map((p) => p.id);
      const placeholders = ids.map(() => '?').join(',');
      const [servicios] = await query(
        `SELECT s.id, s.titulo, s.tarifa, s.tipo_tarifa, s.proveedor_id, c.nombre AS categoria_nombre
         FROM servicios s
         JOIN categorias c ON s.categoria_id = c.id
         WHERE s.proveedor_id IN (${placeholders}) AND s.disponible = 1`,
        ids
      );
      const serviciosPorProveedor = {};
      for (const svc of servicios) {
        if (!serviciosPorProveedor[svc.proveedor_id]) {
          serviciosPorProveedor[svc.proveedor_id] = [];
        }
        serviciosPorProveedor[svc.proveedor_id].push(svc);
      }
      for (const proveedor of proveedores) {
        proveedor.servicios = serviciosPorProveedor[proveedor.id] || [];
      }
    }

    // La distancia y el filtro por radio se calculan arriba con las coordenadas REALES. Quien no es cliente/admin
    // recibe latitud/longitud aproximadas, sin teléfono ni dirección, y la distancia redondeada a 0,5 km (con
    // la distancia exacta desde 3 puntos se podría recuperar la ubicación exacta).
    const exacto = veContactoExacto(req);
    res.json(
      exacto
        ? proveedores
        : proveedores.map((p) => ({
            ...protegerContacto(p, false),
            distancia_km: Math.max(0.5, Math.round(Number(p.distancia_km) * 2) / 2),
          }))
    );
  } catch (err) {
    return next(err);
  }
});

// ── Agenda ──
// El proveedor ve y edita su horario semanal. Formato: { franjas: [{ dia_semana: 0-6, hora_inicio: "08:00", hora_fin: "12:00" }] }.
// Una lista vacía borra el horario (se vuelve al horario por defecto).
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

router.get('/mi-horario', authenticate, authorize('proveedor'), async (req, res, next) => {
  try {
    const franjas = await leerDisponibilidad(pool, req.usuarioId);
    res.json({ franjas, horario_configurado: franjas.length > 0 });
  } catch (err) {
    return next(err);
  }
});

router.put('/mi-horario', authenticate, authorize('proveedor'), async (req, res, next) => {
  try {
    const franjas = req.body && req.body.franjas;
    if (!Array.isArray(franjas) || franjas.length > 28) {
      return res.status(400).json({ error: 'franjas debe ser una lista (máximo 28)' });
    }
    for (const f of franjas) {
      if (
        !f || !Number.isInteger(f.dia_semana) || f.dia_semana < 0 || f.dia_semana > 6 ||
        typeof f.hora_inicio !== 'string' || !HORA.test(f.hora_inicio) ||
        typeof f.hora_fin !== 'string' || !HORA.test(f.hora_fin)
      ) {
        return res.status(400).json({ error: 'Cada franja necesita dia_semana (0-6) y horas con formato HH:MM' });
      }
      if (textoAMinutos(f.hora_fin) - textoAMinutos(f.hora_inicio) < DURACION_MIN) {
        return res.status(400).json({ error: 'Cada franja debe durar al menos una hora y terminar después de su inicio' });
      }
    }
    // Las franjas de un mismo día no pueden solaparse.
    const ordenadas = [...franjas].sort((a, b) => a.dia_semana - b.dia_semana || textoAMinutos(a.hora_inicio) - textoAMinutos(b.hora_inicio));
    for (let i = 1; i < ordenadas.length; i += 1) {
      if (ordenadas[i].dia_semana === ordenadas[i - 1].dia_semana && textoAMinutos(ordenadas[i].hora_inicio) < textoAMinutos(ordenadas[i - 1].hora_fin)) {
        return res.status(400).json({ error: 'Las franjas de un mismo día no pueden solaparse' });
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM disponibilidad_proveedor WHERE proveedor_id = ?', [req.usuarioId]);
      for (const f of ordenadas) {
        await conn.execute(
          'INSERT INTO disponibilidad_proveedor (proveedor_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)',
          [req.usuarioId, f.dia_semana, f.hora_inicio, f.hora_fin]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    } finally {
      conn.release();
    }
    const guardadas = await leerDisponibilidad(pool, req.usuarioId);
    res.json({ franjas: guardadas, horario_configurado: guardadas.length > 0 });
  } catch (err) {
    return next(err);
  }
});

// Horas libres y ocupadas de un proveedor para los próximos días (sin revelar nada de las otras citas).
// ?desde=AAAA-MM-DD (hoy por defecto) &dias=1-14 (7 por defecto) &solicitud_id=N (para reprogramar esa cita).
router.get('/:id/agenda', authenticate, authorize('cliente', 'proveedor', 'admin'), async (req, res, next) => {
  try {
    const proveedorId = Number(req.params.id);
    if (!Number.isInteger(proveedorId) || proveedorId <= 0) return res.status(400).json({ error: 'id inválido' });

    const dias = req.query.dias === undefined ? 7 : Number(req.query.dias);
    if (!Number.isInteger(dias) || dias < 1 || dias > 14) return res.status(400).json({ error: 'dias debe estar entre 1 y 14' });

    const hoy = fechaLocal(Date.now());
    const desde = req.query.desde === undefined ? hoy : String(req.query.desde);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || Number.isNaN(Date.parse(`${desde}T00:00:00Z`))) {
      return res.status(400).json({ error: 'desde debe tener formato AAAA-MM-DD' });
    }
    if (desde < hoy) return res.status(400).json({ error: 'desde no puede ser una fecha pasada' });

    const [prov] = await query("SELECT id FROM usuarios WHERE id = ? AND rol = 'proveedor' AND activo = 1", [proveedorId]);
    if (prov.length === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });

    // Para reprogramar, la cita actual no cuenta como ocupada. Solo la puede indicar quien participa en ella.
    let excluir = 0;
    if (req.query.solicitud_id !== undefined) {
      const solId = Number(req.query.solicitud_id);
      if (!Number.isInteger(solId) || solId <= 0) return res.status(400).json({ error: 'solicitud_id inválido' });
      const [sol] = await query('SELECT cliente_id, proveedor_id FROM solicitudes WHERE id = ?', [solId]);
      if (sol.length === 0 || sol[0].proveedor_id !== proveedorId || (sol[0].cliente_id !== req.usuarioId && sol[0].proveedor_id !== req.usuarioId)) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }
      excluir = solId;
    }

    res.json(await construirAgenda(pool, proveedorId, desde, dias, { excluirSolicitudId: excluir }));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
