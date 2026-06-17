const router = require('express').Router();
const categoriasController = require('../controllers/categorias.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', categoriasController.listarCategorias);
router.post('/', authenticate, authorize('admin'), categoriasController.crearCategoria);
router.put('/:id', authenticate, authorize('admin'), categoriasController.actualizarCategoria);
router.delete('/:id', authenticate, authorize('admin'), categoriasController.eliminarCategoria);

module.exports = router;
