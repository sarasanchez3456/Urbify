const express = require('express');
const router = express.Router();
const verificaciones = require('../controllers/verificaciones.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Todo es del profesional que pide verificarse.
router.use(authenticate, authorize('proveedor'));

router.get('/mia', verificaciones.miVerificacion);
router.post('/mia', verificaciones.iniciar);
// El archivo viaja como cuerpo crudo; el tipo se comprueba por su contenido en el controlador. Un archivo más
// grande que el límite hace que express responda 413 antes de llegar aquí.
router.put(
  '/mia/documentos/:tipo',
  express.raw({ type: ['image/jpeg', 'image/png', 'application/pdf'], limit: verificaciones.MAX_BYTES }),
  verificaciones.subirDocumento
);
router.post('/mia/enviar', verificaciones.enviar);

module.exports = router;
