const pool = require('../config/db');

exports.listarCategorias = async (req, res) => {
  try {
    const [categorias] = await pool.query('SELECT * FROM categorias ORDER BY nombre');
    res.json(categorias);
  } catch (err) {
    console.error('Error al listar categorías:', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};
