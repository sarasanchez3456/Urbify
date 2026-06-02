const router = require('express').Router();
const { query } = require('../config/db');

router.get('/cercanos', async (req, res) => {
  try {
    const { lat, lng, radio = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitud y longitud son requeridas' });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ error: 'Latitud y longitud deben ser números válidos' });
    }

    const radioKm = parseFloat(radio);
    if (isNaN(radioKm) || radioKm <= 0) {
      return res.status(400).json({ error: 'radio debe ser un número positivo' });
    }

    const [proveedores] = await query(
      `SELECT * FROM (
        SELECT u.id, u.nombre, u.apellido, u.foto_url, u.direccion, u.latitud, u.longitud, u.telefono,
         COALESCE(cal_stats.promedio, 0) AS calificacion_promedio,
         COALESCE(cal_stats.total, 0) AS total_calificaciones,
         (6371 * ACOS(
           CASE WHEN ca.cos_val > 1 THEN 1 WHEN ca.cos_val < -1 THEN -1 ELSE ca.cos_val END
         )) AS distancia_km
        FROM usuarios u
        OUTER APPLY (
          SELECT AVG(cal.puntuacion) AS promedio, COUNT(cal.id) AS total
          FROM calificaciones cal
          WHERE cal.proveedor_id = u.id
        ) cal_stats
        CROSS APPLY (VALUES (
          COS(? * PI() / 180) * COS(u.latitud * PI() / 180) *
          COS(u.longitud * PI() / 180 - ? * PI() / 180) + SIN(? * PI() / 180) *
          SIN(u.latitud * PI() / 180)
        )) ca(cos_val)
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
    console.error('Error al buscar proveedores cercanos:', err);
    res.status(500).json({ error: 'Error al buscar proveedores cercanos' });
  }
});

module.exports = router;
