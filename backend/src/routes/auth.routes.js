const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { registroLimiter, loginLimiters, olvidoLimiters, restablecerLimiters } = require('../middleware/rateLimit');
const { validarBody, idParams } = require('../middleware/validate');

idParams(router, 'id');

router.post('/registro', registroLimiter, validarBody('registro'), authController.registrar);
router.post('/login', ...loginLimiters, validarBody('login'), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/olvido-contrasena', ...olvidoLimiters, validarBody('olvidoContrasena'), authController.olvidoContrasena);
router.post('/restablecer-contrasena', ...restablecerLimiters, validarBody('restablecerContrasena'), authController.restablecerContrasena);
router.get('/perfil', authenticate, authController.perfil);
router.put('/perfil', authenticate, validarBody('perfil'), authController.actualizarPerfil);
router.get('/', authenticate, authorize('admin'), authController.listarUsuarios);
router.get('/:id', authenticate, authorize('admin'), authController.usuarioPorId);
router.delete('/:id', authenticate, authorize('admin'), authController.eliminarUsuario);

module.exports = router;
