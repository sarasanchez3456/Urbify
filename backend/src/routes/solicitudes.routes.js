const router = require('express').Router();
const solicitudesController = require('../controllers/solicitudes.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('cliente'), solicitudesController.crearSolicitud);
router.get('/cliente', authenticate, authorize('cliente'), solicitudesController.misSolicitudesComoCliente);
router.get('/proveedor', authenticate, authorize('proveedor'), solicitudesController.misSolicitudesComoProveedor);
router.get('/:id/mensajes', authenticate, authorize('cliente', 'proveedor'), solicitudesController.listarMensajes);
router.post('/:id/mensajes', authenticate, authorize('cliente', 'proveedor'), solicitudesController.enviarMensaje);
router.put('/:id/estado', authenticate, authorize('proveedor', 'cliente'), solicitudesController.actualizarEstadoSolicitud);
router.delete('/:id', authenticate, authorize('cliente', 'proveedor'), solicitudesController.eliminarSolicitud);

module.exports = router;
