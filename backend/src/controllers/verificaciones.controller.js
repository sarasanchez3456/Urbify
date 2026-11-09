// Verificación de profesionales (lado del profesional). Los documentos son datos sensibles: se validan por su
// contenido real (no por lo que diga el nombre o la cabecera), se guardan en la base y solo los ve un administrador.
const { query } = require('../config/db');

const TIPOS = ['cedula', 'certificado', 'foto'];
const MAX_BYTES = 4 * 1024 * 1024;

// Tipo real del archivo según sus primeros bytes. Devuelve el MIME o null si no es JPG, PNG ni PDF.
function tipoReal(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  return null;
}
exports.tipoReal = tipoReal;
exports.TIPOS = TIPOS;
exports.MAX_BYTES = MAX_BYTES;

// Última verificación del profesional (la más reciente).
async function ultima(proveedorId) {
  const [filas] = await query('SELECT * FROM verificaciones WHERE proveedor_id = ? ORDER BY id DESC LIMIT 1', [proveedorId]);
  return filas[0] || null;
}

async function estadoCompleto(proveedorId) {
  const v = await ultima(proveedorId);
  const [[u]] = await query('SELECT verificado FROM usuarios WHERE id = ?', [proveedorId]);
  if (!v) return { verificado: Boolean(u?.verificado), estado: null, documentos: [] };
  const [docs] = await query('SELECT tipo, mime, fecha FROM verificacion_documentos WHERE verificacion_id = ?', [v.id]);
  return {
    verificado: Boolean(u?.verificado),
    id: v.id,
    estado: v.estado,
    motivo_rechazo: v.estado === 'rechazada' ? v.motivo_rechazo : null,
    fecha_envio: v.fecha_envio,
    fecha_respuesta: v.fecha_respuesta,
    documentos: docs,
  };
}

exports.miVerificacion = async (req, res, next) => {
  try {
    res.json(await estadoCompleto(req.usuarioId));
  } catch (err) {
    return next(err);
  }
};

// Empieza una solicitud nueva (borrador). Si ya hay una en curso se devuelve esa; con una aprobada no hace falta otra.
exports.iniciar = async (req, res, next) => {
  try {
    const [[u]] = await query('SELECT verificado FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (u?.verificado) return res.status(409).json({ error: 'Tu cuenta ya está verificada.' });
    const v = await ultima(req.usuarioId);
    if (!v || ['aprobada', 'rechazada'].includes(v.estado)) {
      await query("INSERT INTO verificaciones (proveedor_id, estado) VALUES (?, 'borrador')", [req.usuarioId]);
    }
    res.status(201).json(await estadoCompleto(req.usuarioId));
  } catch (err) {
    return next(err);
  }
};

// El cuerpo es el archivo tal cual (express.raw en la ruta). Solo se puede subir mientras la solicitud es borrador.
exports.subirDocumento = async (req, res, next) => {
  try {
    const { tipo } = req.params;
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo de documento no válido' });
    const archivo = req.body;
    if (!Buffer.isBuffer(archivo) || archivo.length === 0) return res.status(400).json({ error: 'No llegó ningún archivo (usa JPG, PNG o PDF).' });
    if (archivo.length > MAX_BYTES) return res.status(413).json({ error: 'El archivo pesa más de 4 MB.' });
    const mime = tipoReal(archivo);
    if (!mime) return res.status(400).json({ error: 'El archivo debe ser una imagen JPG, PNG o un PDF.' });
    if (tipo === 'foto' && mime === 'application/pdf') return res.status(400).json({ error: 'La foto debe ser una imagen JPG o PNG.' });

    const v = await ultima(req.usuarioId);
    if (!v || v.estado !== 'borrador') return res.status(409).json({ error: 'Primero inicia una solicitud de verificación.' });

    await query(
      `INSERT INTO verificacion_documentos (verificacion_id, tipo, mime, contenido) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE mime = VALUES(mime), contenido = VALUES(contenido), fecha = NOW()`,
      [v.id, tipo, mime, archivo]
    );
    res.json(await estadoCompleto(req.usuarioId));
  } catch (err) {
    return next(err);
  }
};

exports.enviar = async (req, res, next) => {
  try {
    const v = await ultima(req.usuarioId);
    if (!v || v.estado !== 'borrador') return res.status(409).json({ error: 'No hay una solicitud en borrador para enviar.' });
    const [docs] = await query('SELECT tipo FROM verificacion_documentos WHERE verificacion_id = ?', [v.id]);
    const faltan = TIPOS.filter((t) => !docs.some((d) => d.tipo === t));
    if (faltan.length > 0) return res.status(400).json({ error: 'Faltan documentos por subir.', faltan });
    await query("UPDATE verificaciones SET estado = 'pendiente', fecha_envio = NOW() WHERE id = ? AND estado = 'borrador'", [v.id]);
    res.json(await estadoCompleto(req.usuarioId));
  } catch (err) {
    return next(err);
  }
};
