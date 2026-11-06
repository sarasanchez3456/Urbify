const router = require('express').Router();
const { query } = require('../config/db');
const { publicLimiter } = require('../middleware/rateLimit');

// Número decimal estricto ("6.25", "-75.5"): rechaza Infinity, NaN, notación científica, arrays (lat[]=1) y basura.
const DECIMAL = /^-?\d+(\.\d+)?$/;
const numero = (v) => (typeof v === 'string' && DECIMAL.test(v.trim()) ? Number(v) : NaN);

router.get('/cercanos', publicLimiter, async (req, res, next) => {
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
          FROM calificaciones cal
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

    res.json(proveedores);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
