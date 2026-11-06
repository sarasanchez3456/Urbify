const router = require('express').Router();
const notificacionesController = require('../controllers/notificaciones.controller');
const { authenticate } = require('../middleware/auth');
const { validarBody, idParams } = require('../middleware/validate');

idParams(router, 'id');

router.get('/', authenticate, notificacionesController.listarNotificaciones);
router.post('/', authenticate, validarBody('notificacionCrear'), notificacionesController.crearNotificacion);
router.put('/leer-todas', authenticate, notificacionesController.marcarTodasLeidas);
router.put('/:id/leer', authenticate, notificacionesController.marcarLeida);
router.delete('/:id', authenticate, notificacionesController.eliminarNotificacion);
router.delete('/', authenticate, notificacionesController.limpiarTodas);

module.exports = router;
