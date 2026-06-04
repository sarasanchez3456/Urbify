const router = require('express').Router();
const categoriasController = require('../controllers/categorias.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', categoriasController.listarCategorias);
router.post('/', authenticate, categoriasController.crearCategoria);
router.put('/:id', authenticate, categoriasController.actualizarCategoria);
router.delete('/:id', authenticate, categoriasController.eliminarCategoria);

module.exports = router;
