const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/registro', authController.registrar);
router.post('/login', authController.login);
router.get('/perfil', authenticate, authController.perfil);
router.put('/perfil', authenticate, authController.actualizarPerfil);
router.get('/', authenticate, authController.listarUsuarios);
router.get('/:id', authenticate, authController.usuarioPorId);
router.delete('/:id', authenticate, authController.eliminarUsuario);

module.exports = router;
