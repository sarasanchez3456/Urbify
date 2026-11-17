const { query } = require('../config/db');

// Una cuenta con los dos modos solo ve en cada modo las notificaciones de ese modo y las generales (sin modo): así,
// quien atiende como proveedor no recibe en su campana los avisos que le llegaron como cliente, ni al revés. El
// administrador no tiene modo y ve todas las suyas. El modo sale de la sesión (req.usuarioModo), nunca del cliente.
const filtroDeModo = (req) => (req.usuarioModo
  ? { sql: ' AND (modo IS NULL OR modo = ?)', params: [req.usuarioModo] }
  : { sql: '', params: [] });

const esDeOtroModo = (req, notificacion) => Boolean(req.usuarioModo && notificacion.modo && notificacion.modo !== req.usuarioModo);

// Busca la notificación y comprueba que sea del usuario y del modo actual. Responde 404 o 403 y devuelve null si no.
async function notificacionPropia(req, res) {
  const [existe] = await query('SELECT usuario_id, modo FROM notificaciones WHERE id = ?', [req.params.id]);
  if (existe.length === 0) {
    res.status(404).json({ error: 'Notificación no encontrada' });
    return null;
  }
  if (existe[0].usuario_id !== req.usuarioId) {
    res.status(403).json({ error: 'No autorizado para esta notificación' });
    return null;
  }
  if (esDeOtroModo(req, existe[0])) {
    // Es suya, pero de su otro modo: desde este modo no existe.
    res.status(404).json({ error: 'Notificación no encontrada' });
    return null;
  }
  return existe[0];
}

exports.listarNotificaciones = async (req, res, next) => {
  try {
    const filtro = filtroDeModo(req);
    const [notificaciones] = await query(
      `SELECT id, usuario_id, tipo, solicitud_id, modo, mensaje, leida, fecha_creacion
       FROM notificaciones
       WHERE usuario_id = ?${filtro.sql}
       ORDER BY fecha_creacion DESC`,
      [req.usuarioId, ...filtro.params]
    );
    res.json(notificaciones);
  } catch (err) {
    return next(err);
  }
};

exports.crearNotificacion = async (req, res, next) => {
  try {
    const { usuario_id, mensaje } = req.body;
    if (!usuario_id || !mensaje) {
      return res.status(400).json({ error: 'usuario_id y mensaje son requeridos' });
    }
    if (Number(usuario_id) !== req.usuarioId) {
      return res.status(403).json({ error: 'Solo puedes crear notificaciones para ti mismo' });
    }
    // Una notificación que alguien se crea a sí mismo queda en el modo en que está.
    const [result] = await query(
      'INSERT INTO notificaciones (usuario_id, modo, mensaje) VALUES (?, ?, ?)',
      [usuario_id, req.usuarioModo || null, mensaje]
    );
    res.status(201).json({ mensaje: 'Notificación creada exitosamente', id: result.insertId });
  } catch (err) {
    return next(err);
  }
};

exports.marcarLeida = async (req, res, next) => {
  try {
    if (!(await notificacionPropia(req, res))) return;
    await query('UPDATE notificaciones SET leida = 1 WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Notificación marcada como leída' });
  } catch (err) {
    return next(err);
  }
};

exports.marcarTodasLeidas = async (req, res, next) => {
  try {
    const filtro = filtroDeModo(req);
    await query(`UPDATE notificaciones SET leida = 1 WHERE usuario_id = ?${filtro.sql}`, [req.usuarioId, ...filtro.params]);
    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas' });
  } catch (err) {
    return next(err);
  }
};

exports.eliminarNotificacion = async (req, res, next) => {
  try {
    if (!(await notificacionPropia(req, res))) return;
    await query('DELETE FROM notificaciones WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Notificación eliminada exitosamente' });
  } catch (err) {
    return next(err);
  }
};

exports.limpiarTodas = async (req, res, next) => {
  try {
    const filtro = filtroDeModo(req);
    await query(`DELETE FROM notificaciones WHERE usuario_id = ?${filtro.sql}`, [req.usuarioId, ...filtro.params]);
    res.json({ mensaje: 'Todas las notificaciones eliminadas' });
  } catch (err) {
    return next(err);
  }
};
