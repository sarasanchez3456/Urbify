const router = require('express').Router();
const serviciosController = require('../controllers/servicios.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { publicLimiter } = require('../middleware/rateLimit');
const { validarBody, validarQuery, idParams } = require('../middleware/validate');

idParams(router, 'id', 'categoria_id');

router.get('/destacados', publicLimiter, serviciosController.destacados);
router.get('/buscar', publicLimiter, validarQuery('consultaBuscar'), serviciosController.buscarServicios);
router.get('/categoria/:categoria_id', publicLimiter, serviciosController.serviciosPorCategoria);
router.get('/mios', authenticate, authorize('proveedor'), serviciosController.misServicios);
router.get('/:id', publicLimiter, serviciosController.detalleServicio);

router.post('/', authenticate, authorize('proveedor'), validarBody('servicioCrear'), serviciosController.crearServicio);
router.put('/:id', authenticate, authorize('proveedor'), validarBody('servicioEditar'), serviciosController.actualizarServicio);
router.delete('/:id', authenticate, authorize('proveedor'), serviciosController.eliminarServicio);

module.exports = router;
