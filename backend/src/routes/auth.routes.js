const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/registro', authController.registrar);
router.post('/login', authController.login);
router.get('/perfil', authenticate, authController.perfil);
router.put('/perfil', authenticate, authController.actualizarPerfil);

module.exports = router;
