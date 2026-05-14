const router = require('express').Router();
const calificacionesController = require('../controllers/calificaciones.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('cliente'), calificacionesController.crearCalificacion);
router.get('/proveedor/:proveedor_id', calificacionesController.calificacionesProveedor);

module.exports = router;
