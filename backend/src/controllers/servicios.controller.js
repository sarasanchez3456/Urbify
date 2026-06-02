const { query } = require('../config/db');

exports.crearServicio = async (req, res) => {
  try {
    if (req.usuarioRol !== 'proveedor') {
      return res.status(403).json({ error: 'Solo los proveedores pueden crear servicios' });
    }

    const { categoria_id, titulo, descripcion, tarifa, tipo_tarifa } = req.body;

    const [result] = await query(
      `INSERT INTO servicios (proveedor_id, categoria_id, titulo, descripcion, tarifa, tipo_tarifa)
       OUTPUT INSERTED.id
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.usuarioId, categoria_id, titulo, descripcion, tarifa, tipo_tarifa || 'hora']
    );

    res.status(201).json({
      mensaje: 'Servicio creado exitosamente',
      servicio: { id: result[0].id, proveedor_id: req.usuarioId, categoria_id, titulo, descripcion, tarifa },
    });
  } catch (err) {
    console.error('Error al crear servicio:', err);
    res.status(500).json({ error: 'Error al crear servicio' });
  }
};

exports.misServicios = async (req, res) => {
  try {
    const [servicios] = await query(
      `SELECT s.*, c.nombre AS categoria_nombre
       FROM servicios s
       JOIN categorias c ON s.categoria_id = c.id
       WHERE s.proveedor_id = ?
       ORDER BY s.creado_en DESC`,
      [req.usuarioId]
    );
    res.json(servicios);
  } catch (err) {
    console.error('Error al obtener servicios:', err);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
};

exports.serviciosPorCategoria = async (req, res) => {
  try {
    const { categoria_id } = req.params;
    const [servicios] = await query(
      `SELECT s.*, c.nombre AS categoria_nombre,
       u.id AS proveedor_id, u.nombre, u.apellido, u.foto_url, u.direccion, u.latitud, u.longitud,
       COALESCE(cal_stats.promedio, 0) AS calificacion_promedio,
       COALESCE(cal_stats.total, 0) AS total_calificaciones
       FROM servicios s
       JOIN categorias c ON s.categoria_id = c.id
       JOIN usuarios u ON s.proveedor_id = u.id
       OUTER APPLY (
         SELECT AVG(cal.puntuacion) AS promedio, COUNT(cal.id) AS total
         FROM calificaciones cal
         WHERE cal.proveedor_id = u.id
       ) cal_stats
       WHERE s.categoria_id = ? AND s.disponible = 1 AND u.activo = 1
       ORDER BY s.creado_en DESC`,
      [categoria_id]
    );
    res.json(servicios);
  } catch (err) {
    console.error('Error al buscar servicios:', err);
    res.status(500).json({ error: 'Error al buscar servicios' });
  }
};

exports.buscarServicios = async (req, res) => {
  try {
    const { q, categoria_id, disponible } = req.query;

    let sql = `SELECT s.*, c.nombre AS categoria_nombre,
               u.id AS proveedor_id, u.nombre, u.apellido, u.foto_url, u.direccion, u.latitud, u.longitud,
               COALESCE(cal_stats.promedio, 0) AS calificacion_promedio,
               COALESCE(cal_stats.total, 0) AS total_calificaciones
               FROM servicios s
               JOIN categorias c ON s.categoria_id = c.id
               JOIN usuarios u ON s.proveedor_id = u.id
               OUTER APPLY (
                 SELECT AVG(cal.puntuacion) AS promedio, COUNT(cal.id) AS total
                 FROM calificaciones cal
                 WHERE cal.proveedor_id = u.id
               ) cal_stats
               WHERE u.activo = 1`;
    const params = [];

    if (q) {
      const escaped = q.replace(/[%_[\]]/g, '\\$&');
      sql += ` AND (s.titulo LIKE ? OR s.descripcion LIKE ? OR c.nombre LIKE ?)`;
      params.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
    }
    if (categoria_id) {
      sql += ` AND s.categoria_id = ?`;
      params.push(categoria_id);
    }
    if (disponible !== undefined) {
      const dispNum = Number(disponible);
      if (!Number.isInteger(dispNum) || (dispNum !== 0 && dispNum !== 1)) {
        return res.status(400).json({ error: 'disponible debe ser 0 o 1' });
      }
      sql += ` AND s.disponible = ?`;
      params.push(dispNum);
    }

    sql += ` ORDER BY s.creado_en DESC`;

    const [servicios] = await query(sql, params);
    res.json(servicios);
  } catch (err) {
    console.error('Error en búsqueda:', err);
    res.status(500).json({ error: 'Error al buscar servicios' });
  }
};

exports.destacados = async (req, res) => {
  try {
    const [servicios] = await query(
      `SELECT TOP 3 s.id, s.titulo, s.descripcion, s.tarifa, s.tipo_tarifa,
       c.nombre AS categoria_nombre,
       u.id AS proveedor_id, u.nombre, u.apellido, u.foto_url,
       COALESCE(cal_stats.promedio, 0) AS calificacion_promedio,
       COALESCE(cal_stats.total, 0) AS total_calificaciones
       FROM servicios s
       JOIN categorias c ON s.categoria_id = c.id
       JOIN usuarios u ON s.proveedor_id = u.id
       OUTER APPLY (
         SELECT AVG(cal.puntuacion) AS promedio, COUNT(cal.id) AS total
         FROM calificaciones cal
         WHERE cal.proveedor_id = u.id
       ) cal_stats
       WHERE s.disponible = 1 AND u.activo = 1
       ORDER BY calificacion_promedio DESC, total_calificaciones DESC`
    );
    res.json(servicios);
  } catch (err) {
    console.error('Error al obtener destacados:', err);
    res.status(500).json({ error: 'Error al obtener servicios destacados' });
  }
};

exports.actualizarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, tarifa, tipo_tarifa, disponible } = req.body;

    const [servicio] = await query('SELECT * FROM servicios WHERE id = ? AND proveedor_id = ?', [id, req.usuarioId]);
    if (servicio.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado o no autorizado' });
    }

    await query(
      `UPDATE servicios SET titulo = COALESCE(?, titulo), descripcion = COALESCE(?, descripcion),
       tarifa = COALESCE(?, tarifa), tipo_tarifa = COALESCE(?, tipo_tarifa),
       disponible = COALESCE(?, disponible)
       WHERE id = ?`,
      [titulo, descripcion, tarifa, tipo_tarifa, disponible, id]
    );

    res.json({ mensaje: 'Servicio actualizado exitosamente' });
  } catch (err) {
    console.error('Error al actualizar servicio:', err);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
};

exports.eliminarServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const [servicio] = await query('SELECT * FROM servicios WHERE id = ? AND proveedor_id = ?', [id, req.usuarioId]);
    if (servicio.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado o no autorizado' });
    }

    await query('DELETE FROM servicios WHERE id = ?', [id]);
    res.json({ mensaje: 'Servicio eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar servicio:', err);
    if (err.number === 547) {
      return res.status(409).json({ error: 'No se puede eliminar el servicio porque tiene solicitudes asociadas. Desmárcale como no disponible en su lugar.' });
    }
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
};

exports.detalleServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const [servicios] = await query(
      `SELECT s.*, c.nombre AS categoria_nombre,
       u.id AS proveedor_id, u.nombre, u.apellido, u.foto_url, u.direccion, u.telefono, u.latitud, u.longitud,
       COALESCE(cal_stats.promedio, 0) AS calificacion_promedio,
       COALESCE(cal_stats.total, 0) AS total_calificaciones
       FROM servicios s
       JOIN categorias c ON s.categoria_id = c.id
       JOIN usuarios u ON s.proveedor_id = u.id
       OUTER APPLY (
         SELECT AVG(cal.puntuacion) AS promedio, COUNT(cal.id) AS total
         FROM calificaciones cal
         WHERE cal.proveedor_id = u.id
       ) cal_stats
       WHERE s.id = ?`,
      [id]
    );

    if (servicios.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const [comentarios] = await query(
      `SELECT TOP 10 cal.id, cal.puntuacion, cal.comentario, cal.creado_en,
       u.nombre, u.apellido, u.foto_url
       FROM calificaciones cal
       JOIN usuarios u ON cal.cliente_id = u.id
       WHERE cal.proveedor_id = ?
       ORDER BY cal.creado_en DESC`,
      [servicios[0].proveedor_id]
    );

    res.json({ ...servicios[0], comentarios });
  } catch (err) {
    console.error('Error al obtener detalle:', err);
    res.status(500).json({ error: 'Error al obtener detalle del servicio' });
  }
};
