const { Router } = require('express');
const router = Router();
const statsController = require('../controllers/stats.controller');

router.get('/', statsController.getStats);

module.exports = router;
