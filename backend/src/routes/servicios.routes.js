const router = require('express').Router();
const serviciosController = require('../controllers/servicios.controller');
const { authenticate, authenticateOptional, authorize } = require('../middleware/auth');
const { publicLimiter } = require('../middleware/rateLimit');
const { validarBody, validarQuery, idParams } = require('../middleware/validate');

idParams(router, 'id', 'categoria_id');

// Rutas públicas con autenticación opcional: con sesión de cliente/admin devuelven teléfono, dirección y
// coordenadas exactas del proveedor; sin sesión o con sesión de proveedor, sin teléfono ni dirección y con
// coordenadas aproximadas (utils/privacidad.js).
router.get('/destacados', publicLimiter, authenticateOptional, serviciosController.destacados);
router.get('/buscar', publicLimiter, authenticateOptional, validarQuery('consultaBuscar'), serviciosController.buscarServicios);
router.get('/categoria/:categoria_id', publicLimiter, authenticateOptional, serviciosController.serviciosPorCategoria);
router.get('/mios', authenticate, authorize('proveedor'), serviciosController.misServicios);
router.get('/:id', publicLimiter, authenticateOptional, serviciosController.detalleServicio);

router.post('/', authenticate, authorize('proveedor'), validarBody('servicioCrear'), serviciosController.crearServicio);
router.put('/:id', authenticate, authorize('proveedor'), validarBody('servicioEditar'), serviciosController.actualizarServicio);
router.delete('/:id', authenticate, authorize('proveedor'), serviciosController.eliminarServicio);

module.exports = router;
