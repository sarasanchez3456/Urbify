const router = require('express').Router();
const serviciosController = require('../controllers/servicios.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/buscar', serviciosController.buscarServicios);
router.get('/categoria/:categoria_id', serviciosController.serviciosPorCategoria);
router.get('/mios', authenticate, authorize('proveedor'), serviciosController.misServicios);
router.get('/:id', serviciosController.detalleServicio);

router.post('/', authenticate, authorize('proveedor'), serviciosController.crearServicio);
router.put('/:id', authenticate, authorize('proveedor'), serviciosController.actualizarServicio);
router.delete('/:id', authenticate, authorize('proveedor'), serviciosController.eliminarServicio);

module.exports = router;
