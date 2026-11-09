const router = require('express').Router();
const admin = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { idParams } = require('../middleware/validate');

idParams(router, 'id');

// Todo el panel es solo para administradores.
router.use(authenticate, authorize('admin'));

router.get('/resumen', admin.resumen);
router.get('/usuarios/:id', admin.detalleUsuario);
router.put('/usuarios/:id/estado', admin.cambiarEstadoUsuario);
router.get('/servicios', admin.listarServicios);
router.put('/servicios/:id/disponible', admin.cambiarDisponibilidadServicio);
router.get('/solicitudes', admin.listarSolicitudes);
router.put('/solicitudes/:id/cancelar', admin.cancelarSolicitud);
router.get('/resenas', admin.listarResenas);
router.put('/resenas/:id/oculta', admin.cambiarVisibilidadResena);
router.get('/reportes', admin.listarReportes);
router.put('/reportes/:id', admin.actualizarReporte);
router.get('/verificaciones', admin.listarVerificaciones);
router.get('/verificaciones/documentos/:id', admin.documentoVerificacion);
router.put('/verificaciones/:id', admin.responderVerificacion);
router.get('/auditoria', admin.listarAuditoria);

module.exports = router;
