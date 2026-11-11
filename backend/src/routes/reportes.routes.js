const router = require('express').Router();
const reportes = require('../controllers/reportes.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('cliente'), reportes.crearReporte);

module.exports = router;
