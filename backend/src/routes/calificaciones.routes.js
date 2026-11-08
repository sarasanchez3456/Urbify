const router = require('express').Router();
const calificacionesController = require('../controllers/calificaciones.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { publicLimiter } = require('../middleware/rateLimit');
const { validarBody, idParams } = require('../middleware/validate');

idParams(router, 'id', 'proveedor_id');

router.post('/', authenticate, authorize('cliente'), validarBody('calificacionCrear'), calificacionesController.crearCalificacion);
router.get('/proveedor/:proveedor_id', publicLimiter, calificacionesController.calificacionesProveedor);
router.put('/:id', authenticate, authorize('cliente'), validarBody('calificacionEditar'), calificacionesController.actualizarCalificacion);
router.delete('/:id', authenticate, authorize('cliente'), calificacionesController.eliminarCalificacion);

module.exports = router;
