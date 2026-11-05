const { Router } = require('express');
const router = Router();
const statsController = require('../controllers/stats.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Pública: la usa la página de inicio sin sesión (3 cifras).
router.get('/', statsController.getStats);
// Solo administrador: cifras completas del sistema.
router.get('/admin', authenticate, authorize('admin'), statsController.getStatsAdmin);

module.exports = router;
