const router = require('express').Router();
const calificacionesController = require('../controllers/calificaciones.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { publicLimiter } = require('../middleware/rateLimit');

router.post('/', authenticate, authorize('cliente'), calificacionesController.crearCalificacion);
router.get('/proveedor/:proveedor_id', publicLimiter, calificacionesController.calificacionesProveedor);
router.put('/:id', authenticate, authorize('cliente'), calificacionesController.actualizarCalificacion);
router.delete('/:id', authenticate, authorize('cliente'), calificacionesController.eliminarCalificacion);

module.exports = router;
