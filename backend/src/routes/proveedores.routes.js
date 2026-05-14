const router = require('express').Router();
const pool = require('../config/db');

router.get('/cercanos', async (req, res) => {
  try {
    const { lat, lng, radio = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitud y longitud son requeridas' });
    }

    const radioKm = parseFloat(radio);

    const [proveedores] = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.foto_url, u.direccion, u.latitud, u.longitud, u.telefono,
       COALESCE(AVG(cal.puntuacion), 0) AS calificacion_promedio,
       COUNT(cal.id) AS total_calificaciones,
       (6371 * ACOS(COS(RADIANS(?)) * COS(RADIANS(u.latitud)) *
        COS(RADIANS(u.longitud) - RADIANS(?)) + SIN(RADIANS(?)) *
        SIN(RADIANS(u.latitud)))) AS distancia_km
       FROM usuarios u
       LEFT JOIN calificaciones cal ON cal.proveedor_id = u.id
       WHERE u.rol = 'proveedor' AND u.activo = 1
       AND u.latitud IS NOT NULL AND u.longitud IS NOT NULL
       GROUP BY u.id
       HAVING distancia_km <= ?
       ORDER BY distancia_km ASC`,
      [lat, lng, lat, radioKm]
    );

    for (const proveedor of proveedores) {
      const [servicios] = await pool.query(
        `SELECT s.id, s.titulo, s.tarifa, s.tipo_tarifa, c.nombre AS categoria_nombre
         FROM servicios s
         JOIN categorias c ON s.categoria_id = c.id
         WHERE s.proveedor_id = ? AND s.disponible = 1`,
        [proveedor.id]
      );
      proveedor.servicios = servicios;
    }

    res.json(proveedores);
  } catch (err) {
    console.error('Error al buscar proveedores cercanos:', err);
    res.status(500).json({ error: 'Error al buscar proveedores cercanos' });
  }
});

module.exports = router;
