const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/db');
const resend = require('../config/resend');
const { emailFrom } = require('../config/env');
const { normalizarTelefono, MENSAJE_TELEFONO } = require('../utils/telefono');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Recuperación de contraseña
const CODIGO_EXPIRA_MIN = 15;
const CODIGO_MAX_INTENTOS = 5;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt ignora lo que pase de 72 bytes
const CODIGO_INVALIDO = 'Código inválido o expirado';
const HASH_FALSO = bcrypt.hashSync(crypto.randomBytes(8).toString('hex'), 10);

exports.registrar = async (req, res) => {
  try {
    const { nombre, apellido, correo, contrasena, telefono, rol, direccion, latitud, longitud, oficio } = req.body;

    if (!nombre || !apellido || !correo || !contrasena) {
      return res.status(400).json({ error: 'nombre, apellido, correo y contrasena son requeridos' });
    }
    if (!EMAIL_REGEX.test(correo)) {
      return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido' });
    }
    if (!rol || !['cliente', 'proveedor'].includes(rol)) {
      return res.status(400).json({ error: 'rol debe ser cliente o proveedor' });
    }
    if (typeof contrasena !== 'string' || contrasena.length < PASSWORD_MIN || contrasena.length > PASSWORD_MAX) {
      return res.status(400).json({ error: `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres` });
    }
    // El teléfono es opcional; si viene, solo números.
    let telefonoLimpio = null;
    if (telefono !== undefined && telefono !== null && String(telefono).trim() !== '') {
      telefonoLimpio = normalizarTelefono(telefono);
      if (!telefonoLimpio) return res.status(400).json({ error: MENSAJE_TELEFONO });
    }

    const [existe] = await query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (existe.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const [result] = await query(
      `INSERT INTO usuarios (nombre, apellido, correo, contrasena, telefono, rol, direccion, latitud, longitud, oficio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, correo, hashedPassword, telefonoLimpio, rol, direccion || null, latitud || null, longitud || null, oficio || null]
    );

    const usuarioId = result.insertId;

    const token = jwt.sign(
      { id: usuarioId, rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await query(
      'DELETE FROM tokens_sesion WHERE usuario_id = ? AND expira_en < NOW()',
      [usuarioId]
    );
    await query(
      'INSERT INTO tokens_sesion (usuario_id, token, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
      [usuarioId, token]
    );

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      token,
      usuario: { id: usuarioId, nombre, apellido, correo, rol, oficio },
    });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

exports.login = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ error: 'correo y contrasena son requeridos' });
    }

    const [usuarios] = await query(
      'SELECT id, nombre, apellido, correo, contrasena, telefono, rol, foto_url, direccion, latitud, longitud FROM usuarios WHERE correo = ? AND activo = 1',
      [correo]
    );
    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];

    // Los intentos fallidos se limitan por IP y por cuenta en middleware/rateLimit.js, no con un
    // bloqueo de la cuenta: así un tercero no puede dejar fuera a otra persona solo escribiendo su correo.
    const valido = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!valido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await query(
      'DELETE FROM tokens_sesion WHERE usuario_id = ? AND expira_en < NOW()',
      [usuario.id]
    );
    await query(
      'INSERT INTO tokens_sesion (usuario_id, token, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
      [usuario.id, token]
    );

    res.json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        rol: usuario.rol,
        telefono: usuario.telefono,
        foto_url: usuario.foto_url,
        direccion: usuario.direccion,
        latitud: usuario.latitud,
        longitud: usuario.longitud,
      },
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// Paso 1: envía un código de 6 dígitos al correo. Siempre responde igual exista o no la cuenta
// (y antes de hacer el trabajo, para que ni el mensaje ni el tiempo revelen si el correo está registrado).
exports.olvidoContrasena = async (req, res) => {
  const correo = String(req.body?.correo || '').trim();
  if (!EMAIL_REGEX.test(correo)) {
    return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido' });
  }

  res.json({ mensaje: 'Si el correo está registrado, recibirás un código para restablecer tu contraseña' });

  try {
    const [usuarios] = await query('SELECT id, nombre FROM usuarios WHERE correo = ? AND activo = 1', [correo]);
    if (usuarios.length === 0) return;

    const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const codigoHash = await bcrypt.hash(codigo, 10);

    // Un solo código vigente por usuario: pedir otro invalida el anterior.
    await query('DELETE FROM recuperaciones_contrasena WHERE usuario_id = ?', [usuarios[0].id]);
    await query(
      'INSERT INTO recuperaciones_contrasena (usuario_id, codigo_hash, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
      [usuarios[0].id, codigoHash, CODIGO_EXPIRA_MIN]
    );

    await resend.emails.send({
      from: emailFrom,
      to: correo,
      subject: 'Tu código para restablecer la contraseña de Urbify',
      html: `
        <h2>Restablecer contraseña</h2>
        <p>Hola ${usuarios[0].nombre.replace(/[<>&"']/g, '')},</p>
        <p>Tu código es: <strong style="font-size:24px;letter-spacing:4px">${codigo}</strong></p>
        <p>Vence en ${CODIGO_EXPIRA_MIN} minutos y solo sirve una vez. Si no lo pediste, ignora este correo.</p>
      `,
    });
  } catch (err) {
    console.error('Error en olvido de contraseña:', err.message);
  }
};

// Paso 2: valida el código y cambia la contraseña. Cierra todas las sesiones abiertas de la cuenta.
exports.restablecerContrasena = async (req, res) => {
  try {
    const correo = String(req.body?.correo || '').trim();
    const codigo = String(req.body?.codigo || '').trim();
    const nueva = req.body?.nueva_contrasena;

    if (!correo || !codigo || typeof nueva !== 'string') {
      return res.status(400).json({ error: 'correo, codigo y nueva_contrasena son requeridos' });
    }
    if (nueva.length < PASSWORD_MIN || nueva.length > PASSWORD_MAX) {
      return res.status(400).json({ error: `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres` });
    }

    const [filas] = await query(
      `SELECT r.id, r.usuario_id, r.codigo_hash, r.intentos
         FROM recuperaciones_contrasena r
         JOIN usuarios u ON u.id = r.usuario_id
        WHERE u.correo = ? AND u.activo = 1 AND r.usado = 0 AND r.expira_en > NOW()`,
      [correo]
    );
    // Mismo mensaje y mismo costo (un bcrypt) con o sin código vigente.
    const recuperacion = filas[0];
    const coincide = await bcrypt.compare(codigo, recuperacion ? recuperacion.codigo_hash : HASH_FALSO);

    if (!recuperacion || recuperacion.intentos >= CODIGO_MAX_INTENTOS) {
      return res.status(400).json({ error: CODIGO_INVALIDO });
    }
    if (!coincide) {
      await query('UPDATE recuperaciones_contrasena SET intentos = intentos + 1 WHERE id = ?', [recuperacion.id]);
      return res.status(400).json({ error: CODIGO_INVALIDO });
    }

    // Uso único: dos peticiones simultáneas con el mismo código no pueden pasar las dos.
    const [marcado] = await query('UPDATE recuperaciones_contrasena SET usado = 1 WHERE id = ? AND usado = 0', [recuperacion.id]);
    if (marcado.affectedRows === 0) {
      return res.status(400).json({ error: CODIGO_INVALIDO });
    }

    const hash = await bcrypt.hash(nueva, 10);
    await query(
      'UPDATE usuarios SET contrasena = ?, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?',
      [hash, recuperacion.usuario_id]
    );
    await query('DELETE FROM tokens_sesion WHERE usuario_id = ?', [recuperacion.usuario_id]);
    await query('DELETE FROM recuperaciones_contrasena WHERE usuario_id = ?', [recuperacion.usuario_id]);

    res.json({ mensaje: 'Contraseña actualizada. Inicia sesión con la nueva contraseña.' });
  } catch (err) {
    console.error('Error al restablecer contraseña:', err);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
};

// Invalida solo el token de esta petición (la sesión de este dispositivo);
// otras sesiones del mismo usuario siguen activas.
exports.logout = async (req, res) => {
  try {
    await query('DELETE FROM tokens_sesion WHERE token = ? AND usuario_id = ?', [req.token, req.usuarioId]);
    res.json({ mensaje: 'Sesión cerrada exitosamente' });
  } catch (err) {
    console.error('Error en logout:', err);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};

exports.perfil = async (req, res) => {
  try {
    const [usuarios] = await query(
      `SELECT id, nombre, apellido, correo, telefono, rol, foto_url, direccion, latitud, longitud, oficio, fecha_creacion
       FROM usuarios WHERE id = ?`,
      [req.usuarioId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuarios[0]);
  } catch (err) {
    console.error('Error al obtener perfil:', err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

exports.actualizarPerfil = async (req, res) => {
  try {
    const { nombre, apellido, telefono, direccion, latitud, longitud, foto_url, oficio } = req.body;

    // Vacío o ausente = no cambiar el teléfono; si viene un valor, solo números.
    let telefonoLimpio = null;
    if (telefono !== undefined && telefono !== null && String(telefono).trim() !== '') {
      telefonoLimpio = normalizarTelefono(telefono);
      if (!telefonoLimpio) return res.status(400).json({ error: MENSAJE_TELEFONO });
    }

    await query(
      `UPDATE usuarios SET nombre = COALESCE(?, nombre), apellido = COALESCE(?, apellido),
       telefono = COALESCE(?, telefono), direccion = COALESCE(?, direccion),
       latitud = COALESCE(?, latitud), longitud = COALESCE(?, longitud),
       foto_url = COALESCE(?, foto_url), oficio = COALESCE(?, oficio)
       WHERE id = ?`,
      [nombre, apellido, telefonoLimpio, direccion, latitud, longitud, foto_url, oficio, req.usuarioId]
    );

    const [usuarios] = await query(
      `SELECT id, nombre, apellido, correo, telefono, rol, foto_url, direccion, latitud, longitud, oficio, fecha_creacion
       FROM usuarios WHERE id = ?`,
      [req.usuarioId]
    );
    res.json({ mensaje: 'Perfil actualizado exitosamente', usuario: usuarios[0] });
  } catch (err) {
    console.error('Error al actualizar perfil:', err);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

exports.listarUsuarios = async (req, res) => {
  try {
    const [usuarios] = await query(
      'SELECT id, nombre, apellido, correo, telefono, rol, activo, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC'
    );
    res.json(usuarios);
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

exports.usuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [usuarios] = await query(
      'SELECT id, nombre, apellido, correo, telefono, rol, foto_url, direccion, latitud, longitud, oficio, activo, fecha_creacion FROM usuarios WHERE id = ?',
      [id]
    );
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuarios[0]);
  } catch (err) {
    console.error('Error al obtener usuario:', err);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

exports.eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.usuarioId) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }
    const [existe] = await query('SELECT id, rol FROM usuarios WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    // Un admin no puede borrar a otro admin: evita que una cuenta admin comprometida
    // desmonte la administración. Los admins solo se gestionan desde el servidor (create-admin).
    if (existe[0].rol === 'admin') {
      return res.status(403).json({ error: 'No se puede eliminar a un administrador desde la API' });
    }
    await query('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ mensaje: 'Usuario eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    if (err.errno === 1451) {
      return res.status(409).json({ error: 'No se puede eliminar el usuario porque tiene solicitudes o calificaciones asociadas' });
    }
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};