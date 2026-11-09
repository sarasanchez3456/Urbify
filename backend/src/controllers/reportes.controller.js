// Reportes: el cliente avisa a la administración de un problema con el profesional de una solicitud suya.
const { query } = require('../config/db');

const MOTIVOS = ['no_llego', 'cobro_distinto', 'mal_servicio', 'trato_inadecuado', 'otro'];

exports.MOTIVOS_REPORTE = MOTIVOS;

exports.crearReporte = async (req, res, next) => {
  try {
    const solicitudId = Number(req.body?.solicitud_id);
    const { motivo } = req.body || {};
    const detalle = typeof req.body?.detalle === 'string' ? req.body.detalle.trim() : '';

    if (!Number.isInteger(solicitudId) || solicitudId <= 0) return res.status(400).json({ error: 'solicitud_id no es válido' });
    if (!MOTIVOS.includes(motivo)) return res.status(400).json({ error: 'Elige un motivo de la lista' });
    if (detalle.length < 10 || detalle.length > 1000) return res.status(400).json({ error: 'Cuéntanos qué pasó en 10 a 1000 caracteres' });

    const [filas] = await query('SELECT id, cliente_id, proveedor_id FROM solicitudes WHERE id = ?', [solicitudId]);
    // Se responde 404 también cuando la solicitud es de otro cliente, para no revelar que existe.
    if (filas.length === 0 || filas[0].cliente_id !== req.usuarioId) return res.status(404).json({ error: 'Solicitud no encontrada' });

    try {
      const [r] = await query(
        'INSERT INTO reportes (reportante_id, reportado_id, solicitud_id, motivo, detalle) VALUES (?, ?, ?, ?, ?)',
        [req.usuarioId, filas[0].proveedor_id, solicitudId, motivo, detalle]
      );
      res.status(201).json({ mensaje: 'Reporte enviado. La administración lo revisará.', id: r.insertId });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya reportaste esta solicitud. La administración la está revisando.' });
      throw err;
    }
  } catch (err) {
    return next(err);
  }
};
