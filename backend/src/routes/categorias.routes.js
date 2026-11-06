const router = require('express').Router();
const categoriasController = require('../controllers/categorias.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { publicLimiter } = require('../middleware/rateLimit');
const { validarBody, idParams } = require('../middleware/validate');

idParams(router, 'id');

router.get('/', publicLimiter, categoriasController.listarCategorias);
router.post('/', authenticate, authorize('admin'), validarBody('categoriaCrear'), categoriasController.crearCategoria);
router.put('/:id', authenticate, authorize('admin'), validarBody('categoriaEditar'), categoriasController.actualizarCategoria);
router.delete('/:id', authenticate, authorize('admin'), categoriasController.eliminarCategoria);

module.exports = router;
