const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { registroLimiter, loginLimiters, olvidoLimiters, restablecerLimiters } = require('../middleware/rateLimit');

router.post('/registro', registroLimiter, authController.registrar);
router.post('/login', ...loginLimiters, authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/olvido-contrasena', ...olvidoLimiters, authController.olvidoContrasena);
router.post('/restablecer-contrasena', ...restablecerLimiters, authController.restablecerContrasena);
router.get('/perfil', authenticate, authController.perfil);
router.put('/perfil', authenticate, authController.actualizarPerfil);
router.get('/', authenticate, authorize('admin'), authController.listarUsuarios);
router.get('/:id', authenticate, authorize('admin'), authController.usuarioPorId);
router.delete('/:id', authenticate, authorize('admin'), authController.eliminarUsuario);

module.exports = router;
