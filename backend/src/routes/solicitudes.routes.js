const router = require('express').Router();
const solicitudesController = require('../controllers/solicitudes.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validarBody, idParams } = require('../middleware/validate');

idParams(router, 'id');

router.post('/', authenticate, authorize('cliente'), validarBody('solicitudCrear'), solicitudesController.crearSolicitud);
router.get('/cliente', authenticate, authorize('cliente'), solicitudesController.misSolicitudesComoCliente);
router.get('/proveedor', authenticate, authorize('proveedor'), solicitudesController.misSolicitudesComoProveedor);
router.get('/:id/mensajes', authenticate, authorize('cliente', 'proveedor'), solicitudesController.listarMensajes);
router.post('/:id/mensajes', authenticate, authorize('cliente', 'proveedor'), validarBody('mensajeCrear'), solicitudesController.enviarMensaje);
router.put('/:id/estado', authenticate, authorize('proveedor', 'cliente'), validarBody('solicitudEstado'), solicitudesController.actualizarEstadoSolicitud);
router.delete('/:id', authenticate, authorize('cliente', 'proveedor'), solicitudesController.eliminarSolicitud);

module.exports = router;
