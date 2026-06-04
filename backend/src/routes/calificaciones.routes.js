const router = require('express').Router();
const calificacionesController = require('../controllers/calificaciones.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('cliente'), calificacionesController.crearCalificacion);
router.get('/proveedor/:proveedor_id', calificacionesController.calificacionesProveedor);
router.put('/:id', authenticate, calificacionesController.actualizarCalificacion);
router.delete('/:id', authenticate, calificacionesController.eliminarCalificacion);

module.exports = router;
