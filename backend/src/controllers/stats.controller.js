const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const [proveedores] = await db.query(
      "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'proveedor' AND activo = 1"
    );
    const [solicitudesCompletadas] = await db.query(
      "SELECT COUNT(*) AS total FROM solicitudes WHERE estado = 'completada'"
    );
    const [calificacion] = await db.query(
      'SELECT AVG(CAST(puntuacion AS DECIMAL(3,2))) AS media FROM calificaciones'
    );

    res.json({
      proveedores_activos: proveedores[0]?.total || 0,
      servicios_realizados: solicitudesCompletadas[0]?.total || 0,
      calificacion_media: calificacion[0]?.media
        ? parseFloat(calificacion[0].media).toFixed(1)
        : '0.0',
    });
  } catch (err) {
    console.error('Error al obtener stats:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};
