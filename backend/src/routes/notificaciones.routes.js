const router = require('express').Router();
const notificacionesController = require('../controllers/notificaciones.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, notificacionesController.listarNotificaciones);
router.post('/', authenticate, notificacionesController.crearNotificacion);
router.put('/:id/leer', authenticate, notificacionesController.marcarLeida);
router.delete('/:id', authenticate, notificacionesController.eliminarNotificacion);

module.exports = router;
