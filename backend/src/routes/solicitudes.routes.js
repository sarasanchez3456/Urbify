const router = require('express').Router();
const solicitudesController = require('../controllers/solicitudes.controller');
const reprogramaciones = require('../controllers/reprogramaciones.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validarBody, idParams } = require('../middleware/validate');
const { codigoInicioLimiter, renovarCodigoInicioLimiter } = require('../middleware/rateLimit');

idParams(router, 'id');

router.post('/', authenticate, authorize('cliente'), validarBody('solicitudCrear'), solicitudesController.crearSolicitud);
router.get('/cliente', authenticate, authorize('cliente'), solicitudesController.misSolicitudesComoCliente);
router.get('/proveedor', authenticate, authorize('proveedor'), solicitudesController.misSolicitudesComoProveedor);
router.get('/:id/mensajes', authenticate, authorize('cliente', 'proveedor'), solicitudesController.listarMensajes);
router.post('/:id/mensajes', authenticate, authorize('cliente', 'proveedor'), validarBody('mensajeCrear'), solicitudesController.enviarMensaje);
router.get('/:id/historial', authenticate, authorize('cliente', 'proveedor'), solicitudesController.listarHistorial);
router.get('/:id/reprogramaciones', authenticate, authorize('cliente', 'proveedor'), reprogramaciones.listarReprogramaciones);
router.post('/:id/reprogramaciones', authenticate, authorize('cliente'), reprogramaciones.crearReprogramacion);
router.put('/:id/reprogramaciones/:rid', authenticate, authorize('cliente', 'proveedor'), reprogramaciones.responderReprogramacion);
router.put('/:id/estado', authenticate, authorize('proveedor', 'cliente'), codigoInicioLimiter, validarBody('solicitudEstado'), solicitudesController.actualizarEstadoSolicitud);
// Código de inicio del servicio (issue #57): solo el cliente de la solicitud lo ve o lo renueva.
router.get('/:id/codigo-inicio', authenticate, authorize('cliente'), solicitudesController.verCodigoInicio);
router.post('/:id/codigo-inicio', authenticate, authorize('cliente'), renovarCodigoInicioLimiter, solicitudesController.renovarCodigoInicio);
router.delete('/:id', authenticate, authorize('cliente', 'proveedor'), solicitudesController.eliminarSolicitud);

module.exports = router;
