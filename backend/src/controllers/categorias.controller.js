const { query } = require('../config/db');
const { registrarAuditoria } = require('../utils/auditoria');

exports.listarCategorias = async (req, res, next) => {
  try {
    const [categorias] = await query('SELECT * FROM categorias ORDER BY nombre');
    res.json(categorias);
  } catch (err) {
    return next(err);
  }
};

exports.crearCategoria = async (req, res, next) => {
  try {
    const { nombre, descripcion, icono_url } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'nombre es requerido' });
    }
    const [result] = await query(
      'INSERT INTO categorias (nombre, descripcion, icono_url) VALUES (?, ?, ?)',
      [nombre, descripcion || null, icono_url || null]
    );
    await registrarAuditoria(req.usuarioId, 'categoria', 'Creó la categoría', nombre);
    res.status(201).json({ mensaje: 'Categoría creada exitosamente', id: result.insertId });
  } catch (err) {
    return next(err);
  }
};

exports.actualizarCategoria = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, icono_url } = req.body;
    const [existe] = await query('SELECT id, nombre FROM categorias WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    await registrarAuditoria(req.usuarioId, 'categoria', 'Editó la categoría', existe[0].nombre);
    await query(
      'UPDATE categorias SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion), icono_url = COALESCE(?, icono_url) WHERE id = ?',
      [nombre, descripcion, icono_url, id]
    );
    res.json({ mensaje: 'Categoría actualizada exitosamente' });
  } catch (err) {
    return next(err);
  }
};

exports.eliminarCategoria = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existe] = await query('SELECT id, nombre FROM categorias WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    await query('DELETE FROM categorias WHERE id = ?', [id]);
    await registrarAuditoria(req.usuarioId, 'categoria', 'Eliminó la categoría', existe[0].nombre);
    res.json({ mensaje: 'Categoría eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar categoría:', err);
    if (err.errno === 1451) {
      return res.status(409).json({ error: 'No se puede eliminar la categoría porque tiene servicios asociados' });
    }
    return next(err);
  }
};
