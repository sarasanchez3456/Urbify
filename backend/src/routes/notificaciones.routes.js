const router = require('express').Router();
const notificacionesController = require('../controllers/notificaciones.controller');
const { authenticate } = require('../middleware/auth');
const { validarBody, idParams } = require('../middleware/validate');
const avisos = require('../utils/avisos');

idParams(router, 'id');

// Canal de avisos en vivo (SSE). Va antes de '/:id' y exige la sesión como cualquier otra ruta.
router.get('/stream', authenticate, (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write('retry: 5000\n\n');
  avisos.suscribir(req.usuarioId, res);
  // Latido para que proxies y navegadores no cierren la conexión por inactividad.
  const latido = setInterval(() => { try { res.write(': latido\n\n'); } catch { /* cerrada */ } }, 25000);
  res.on('close', () => clearInterval(latido));
});

router.get('/', authenticate, notificacionesController.listarNotificaciones);
router.post('/', authenticate, validarBody('notificacionCrear'), notificacionesController.crearNotificacion);
router.put('/leer-todas', authenticate, notificacionesController.marcarTodasLeidas);
router.put('/:id/leer', authenticate, notificacionesController.marcarLeida);
router.delete('/:id', authenticate, notificacionesController.eliminarNotificacion);
router.delete('/', authenticate, notificacionesController.limpiarTodas);

module.exports = router;
