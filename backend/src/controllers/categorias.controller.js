const { query } = require('../config/db');

exports.listarCategorias = async (req, res) => {
  try {
    const [categorias] = await query('SELECT * FROM categorias ORDER BY nombre');
    res.json(categorias);
  } catch (err) {
    console.error('Error al listar categorías:', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};

exports.crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion, icono_url } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'nombre es requerido' });
    }
    const [result] = await query(
      `INSERT INTO categorias (nombre, descripcion, icono_url) OUTPUT INSERTED.id VALUES (?, ?, ?)`,
      [nombre, descripcion || null, icono_url || null]
    );
    res.status(201).json({ mensaje: 'Categoría creada exitosamente', id: result[0].id });
  } catch (err) {
    console.error('Error al crear categoría:', err);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
};

exports.actualizarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, icono_url } = req.body;
    const [existe] = await query('SELECT id FROM categorias WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    await query(
      'UPDATE categorias SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion), icono_url = COALESCE(?, icono_url) WHERE id = ?',
      [nombre, descripcion, icono_url, id]
    );
    res.json({ mensaje: 'Categoría actualizada exitosamente' });
  } catch (err) {
    console.error('Error al actualizar categoría:', err);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
};

exports.eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const [existe] = await query('SELECT id FROM categorias WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    await query('DELETE FROM categorias WHERE id = ?', [id]);
    res.json({ mensaje: 'Categoría eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar categoría:', err);
    if (err.number === 547) {
      return res.status(409).json({ error: 'No se puede eliminar la categoría porque tiene servicios asociados' });
    }
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
};
