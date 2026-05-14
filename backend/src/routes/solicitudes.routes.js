const router = require('express').Router();
const solicitudesController = require('../controllers/solicitudes.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('cliente'), solicitudesController.crearSolicitud);
router.get('/cliente', authenticate, authorize('cliente'), solicitudesController.misSolicitudesComoCliente);
router.get('/proveedor', authenticate, authorize('proveedor'), solicitudesController.misSolicitudesComoProveedor);
router.put('/:id/estado', authenticate, authorize('proveedor'), solicitudesController.actualizarEstadoSolicitud);

module.exports = router;
