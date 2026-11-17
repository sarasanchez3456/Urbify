const db = require('../config/db');

// Estadísticas completas del sistema (RF-17 / CU-11). Solo administrador.
exports.getStatsAdmin = async (req, res, next) => {
  try {
    const [usuariosPorRol] = await db.query(
      'SELECT rol, COUNT(*) AS total FROM usuarios GROUP BY rol'
    );
    const [cuentasPorCapacidadYModo] = await db.query(
      `SELECT
         COALESCE(SUM(es_proveedor = 1), 0) AS con_capacidad_proveedor,
         COALESCE(SUM(modo_activo = 'cliente'), 0) AS en_modo_cliente,
         COALESCE(SUM(modo_activo = 'proveedor'), 0) AS en_modo_proveedor,
         COALESCE(SUM(rol = 'admin'), 0) AS administradores
       FROM usuarios`
    );
    const [servicios] = await db.query(
      'SELECT COUNT(*) AS total, COALESCE(SUM(disponible = 1), 0) AS disponibles FROM servicios'
    );
    const [solicitudesPorEstado] = await db.query(
      'SELECT estado, COUNT(*) AS total FROM solicitudes GROUP BY estado'
    );
    const [calificaciones] = await db.query(
      'SELECT COUNT(*) AS total, AVG(puntuacion) AS media FROM calificaciones WHERE oculta = 0'
    );

    // Se devuelven todas las claves, también las que tienen 0, para que el cliente no tenga que suponerlas.
    const usuarios = { cliente: 0, proveedor: 0, admin: 0 };
    for (const fila of usuariosPorRol) usuarios[fila.rol] = Number(fila.total);

    const solicitudes = { pendiente: 0, aceptada: 0, en_proceso: 0, completada: 0, cancelada: 0 };
    for (const fila of solicitudesPorEstado) solicitudes[fila.estado] = Number(fila.total);

    res.json({
      usuarios_por_rol: usuarios,
      // Compatibilidad: usuarios_por_rol sigue contando el rol histórico;
      // las capacidades y los modos se exponen de forma independiente.
      cuentas_por_capacidad_y_modo: {
        con_capacidad_proveedor: Number(cuentasPorCapacidadYModo[0].con_capacidad_proveedor),
        en_modo_cliente: Number(cuentasPorCapacidadYModo[0].en_modo_cliente),
        en_modo_proveedor: Number(cuentasPorCapacidadYModo[0].en_modo_proveedor),
        administradores: Number(cuentasPorCapacidadYModo[0].administradores),
      },
      servicios: {
        total: Number(servicios[0].total),
        disponibles: Number(servicios[0].disponibles),
      },
      solicitudes_por_estado: solicitudes,
      calificaciones: {
        total: Number(calificaciones[0].total),
        media: calificaciones[0].media ? Number(parseFloat(calificaciones[0].media).toFixed(1)) : 0,
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const [proveedores] = await db.query(
      'SELECT COUNT(*) AS total FROM usuarios WHERE es_proveedor = 1 AND activo = 1'
    );
    const [solicitudesCompletadas] = await db.query(
      "SELECT COUNT(*) AS total FROM solicitudes WHERE estado = 'completada'"
    );
    const [calificacion] = await db.query(
      'SELECT AVG(CAST(puntuacion AS DECIMAL(3,2))) AS media FROM calificaciones WHERE oculta = 0'
    );

    res.json({
      proveedores_activos: proveedores[0]?.total || 0,
      servicios_realizados: solicitudesCompletadas[0]?.total || 0,
      calificacion_media: calificacion[0]?.media
        ? parseFloat(calificacion[0].media).toFixed(1)
        : '0.0',
    });
  } catch (err) {
    return next(err);
  }
};
