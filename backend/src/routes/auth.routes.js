const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/registro', authController.registrar);
router.post('/login', authController.login);
router.get('/perfil', authenticate, authController.perfil);
router.put('/perfil', authenticate, authController.actualizarPerfil);
router.get('/', authenticate, authorize('admin'), authController.listarUsuarios);
router.get('/:id', authenticate, authorize('admin'), authController.usuarioPorId);
router.delete('/:id', authenticate, authorize('admin'), authController.eliminarUsuario);

module.exports = router;
