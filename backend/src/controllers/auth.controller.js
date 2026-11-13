const bcrypt = require('bcryptjs'); // solo para HASH_FALSO al arrancar; el resto va por passwordHasher (workers)
const hasher = require('../utils/passwordHasher');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/db');
const { NODE_ENV } = require('../config/env');
const { enviarCorreo } = require('../utils/correo');
const { enTransaccion } = require('../utils/transaccion');
const { generarCodigo, normalizarCodigo, hashDeCodigo, codigoCoincide } = require('../utils/codigoVerificacion');
const { dominioPuedeRecibirCorreo } = require('../utils/dominioCorreo');
const { normalizarTelefono, MENSAJE_TELEFONO } = require('../utils/telefono');
const { escapeHtml } = require('../utils/html');
const { errorDeDireccion } = require('../utils/direccion');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Recuperación de contraseña
const CODIGO_EXPIRA_MIN = 15;
const CODIGO_MAX_INTENTOS = 5;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt ignora lo que pase de 72 bytes
const CODIGO_INVALIDO = 'Código inválido o expirado';
const HASH_FALSO = bcrypt.hashSync(crypto.randomBytes(8).toString('hex'), 10);

// ── Verificación de correo ──
// La cuenta nace SIN verificar y sin sesión: solo el código que llega al correo la activa. Así nadie puede registrarse
// con el correo de otra persona ni dejar cuentas con correos falsos.
const VERIFICACION_EXPIRA_MIN = 10;
const VERIFICACION_MAX_INTENTOS = 5;
const VERIFICACION_ESPERA_SEG = 60; // entre un envío y el siguiente al mismo correo
const VERIFICACION_PENDIENTE_HORAS = 24; // una cuenta sin verificar se borra pasado este tiempo
const CODIGO_VERIFICACION_INVALIDO = 'Código inválido o vencido';
const MENSAJE_CODIGO_ENVIADO = 'Si el correo es válido, te enviamos un código de verificación. Revisa tu bandeja de entrada (y el spam).';
// En las pruebas los correos son de mentira (@pruebas.test) y no hay DNS: allí no se comprueba el dominio.
const verificarDominioCorreo = NODE_ENV !== 'test' && process.env.VERIFICAR_DOMINIO_CORREO !== 'false';

const normalizarCorreo = (valor) => String(valor || '').trim().toLowerCase();

// Guarda un código nuevo (reemplaza al anterior: solo hay uno vigente por usuario) y lo envía al correo.
// Con `respetarEspera`, si ya se envió uno hace menos de un minuto no se envía otro (frena el spam a un correo).
async function enviarCodigoDeVerificacion(usuarioId, correo, nombre, { respetarEspera = false } = {}) {
  if (respetarEspera) {
    const [recientes] = await query(
      'SELECT 1 FROM verificaciones_correo WHERE usuario_id = ? AND fecha_envio > DATE_SUB(NOW(), INTERVAL ? SECOND)',
      [usuarioId, VERIFICACION_ESPERA_SEG]
    );
    if (recientes.length > 0) return;
  }
  const codigo = generarCodigo();
  await query(
    `INSERT INTO verificaciones_correo (usuario_id, codigo_hash, expira_en, intentos, fecha_envio)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), 0, NOW())
     ON DUPLICATE KEY UPDATE codigo_hash = VALUES(codigo_hash), expira_en = VALUES(expira_en), intentos = 0, fecha_envio = NOW()`,
    [usuarioId, hashDeCodigo(codigo, usuarioId), VERIFICACION_EXPIRA_MIN]
  );
  await enviarCorreo({
    to: correo,
    subject: 'Tu código de verificación de Urbify',
    html: `
      <h2>Verifica tu correo</h2>
      <p>Hola ${escapeHtml(nombre)},</p>
      <p>Tu código de verificación es:</p>
      <p><strong style="font-size:28px;letter-spacing:6px">${codigo}</strong></p>
      <p>Vence en ${VERIFICACION_EXPIRA_MIN} minutos y solo sirve una vez. Escríbelo en Urbify tal como aparece.</p>
      <p><strong>No compartas este código con nadie:</strong> Urbify nunca te lo pedirá por mensaje, llamada ni correo.
      Si no creaste una cuenta, ignora este mensaje.</p>
    `,
    textoDev: `código de verificación ${codigo}`,
  });
}

// Si el correo ya tiene una cuenta, no se revela en la respuesta (sería una forma de averiguar quién usa Urbify):
// se le avisa por correo a su dueño.
async function avisarCorreoYaRegistrado(correo, nombre) {
  await enviarCorreo({
    to: correo,
    subject: 'Alguien intentó registrarse con tu correo en Urbify',
    html: `
      <h2>Ya tienes una cuenta</h2>
      <p>Hola ${escapeHtml(nombre)},</p>
      <p>Alguien intentó crear una cuenta en Urbify con este correo, pero ya tienes una.</p>
      <p>Si fuiste tú, inicia sesión (o usa "¿Olvidaste tu contraseña?" si no la recuerdas). Si no fuiste tú, ignora este mensaje: tu cuenta sigue segura.</p>
    `,
  });
}

const enSegundoPlano = (promesa, contexto) => promesa.catch((err) => console.error(`${contexto}:`, err.message));

exports.registrar = async (req, res, next) => {
  try {
    const { nombre, apellido, contrasena, telefono, rol, direccion, latitud, longitud, oficio } = req.body;
    const correo = normalizarCorreo(req.body.correo);

    if (!nombre || !apellido || !correo || !contrasena) {
      return res.status(400).json({ error: 'nombre, apellido, correo y contrasena son requeridos' });
    }
    const errorDir = errorDeDireccion(direccion);
    if (errorDir) return res.status(400).json({ error: errorDir });
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
    // Evita errores de tipeo ("gmial.com"): el dominio debe existir. No dice nada de la cuenta, solo del dominio.
    if (verificarDominioCorreo && !(await dominioPuedeRecibirCorreo(correo))) {
      return res.status(400).json({ error: 'El dominio del correo no existe. Revisa que esté bien escrito.' });
    }

    // Las cuentas que nunca se verificaron se borran pasado un día (liberan el correo).
    await query(
      'DELETE FROM usuarios WHERE correo_verificado = 0 AND fecha_creacion < DATE_SUB(NOW(), INTERVAL ? HOUR)',
      [VERIFICACION_PENDIENTE_HORAS]
    );

    // Se cifra la contraseña SIEMPRE, exista o no el correo: así la respuesta tarda lo mismo en ambos casos.
    const hashedPassword = await hasher.hash(contrasena, 10);
    const [existe] = await query('SELECT id, nombre, correo_verificado, activo FROM usuarios WHERE correo = ?', [correo]);

    let pendiente = null; // { id } si hay que enviar un código
    let yaRegistrado = null; // { nombre } si hay que avisarle a su dueño
    if (existe.length > 0 && (existe[0].correo_verificado || !existe[0].activo)) {
      yaRegistrado = { nombre: existe[0].nombre };
    } else if (existe.length > 0) {
      // Cuenta sin verificar: el ÚLTIMO registro gana. Si alguien se registró antes con este correo (con su propia
      // contraseña), quien de verdad lo posee sustituye todos los datos y la contraseña del primero deja de servir.
      // Al primero no le sirve el código: llega al correo de la víctima, no al suyo.
      await query(
        `UPDATE usuarios SET nombre = ?, apellido = ?, contrasena = ?, telefono = ?, rol = ?, direccion = ?, latitud = ?,
                longitud = ?, oficio = ?, fecha_creacion = NOW()
          WHERE id = ? AND correo_verificado = 0`,
        [nombre, apellido, hashedPassword, telefonoLimpio, rol, direccion || null, latitud || null, longitud || null, oficio || null, existe[0].id]
      );
      pendiente = { id: existe[0].id };
    } else {
      try {
        const [result] = await query(
          `INSERT INTO usuarios (nombre, apellido, correo, contrasena, telefono, rol, direccion, latitud, longitud, oficio)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [nombre, apellido, correo, hashedPassword, telefonoLimpio, rol, direccion || null, latitud || null, longitud || null, oficio || null]
        );
        pendiente = { id: result.insertId };
      } catch (err) {
        // Registros simultáneos con el mismo correo: el SELECT previo no es atómico, pero el UNIQUE sí lo es.
        if (err.code !== 'ER_DUP_ENTRY') throw err;
        yaRegistrado = { nombre };
      }
    }

    // Misma respuesta en todos los casos y SIN token: la sesión solo se da al verificar el código.
    res.status(202).json({
      mensaje: MENSAJE_CODIGO_ENVIADO,
      requiere_verificacion: true,
      correo,
      expira_minutos: VERIFICACION_EXPIRA_MIN,
    });

    if (pendiente) {
      enSegundoPlano(
        enviarCodigoDeVerificacion(pendiente.id, correo, nombre, { respetarEspera: true }),
        'No se pudo enviar el código de verificación'
      );
    } else if (yaRegistrado) {
      enSegundoPlano(avisarCorreoYaRegistrado(correo, yaRegistrado.nombre), 'No se pudo avisar al dueño del correo');
    }
  } catch (err) {
    return next(err);
  }
};

// Valida el código y, si es correcto, activa la cuenta e inicia la sesión.
// Seguridad: el intento se CUENTA antes de comparar (una sola instrucción atómica), así que 100 peticiones simultáneas
// no pueden probar más de 5 códigos; los errores son siempre el mismo mensaje; el código se borra al usarse.
exports.verificarCorreo = async (req, res, next) => {
  try {
    const correo = normalizarCorreo(req.body.correo);
    const codigo = normalizarCodigo(req.body.codigo); // mayúsculas, sin espacios ni guiones; null si no tiene forma de código
    if (!EMAIL_REGEX.test(correo) || !codigo) return res.status(400).json({ error: CODIGO_VERIFICACION_INVALIDO });

    const [filas] = await query(
      `SELECT u.id, u.nombre, u.apellido, u.correo, u.telefono, u.rol, u.foto_url, u.direccion, u.latitud, u.longitud, u.oficio,
              v.codigo_hash
         FROM usuarios u JOIN verificaciones_correo v ON v.usuario_id = u.id
        WHERE u.correo = ? AND u.activo = 1 AND u.correo_verificado = 0 AND v.expira_en > NOW()`,
      [correo]
    );
    if (filas.length === 0) return res.status(400).json({ error: CODIGO_VERIFICACION_INVALIDO });
    const usuario = filas[0];

    const [intento] = await query(
      'UPDATE verificaciones_correo SET intentos = intentos + 1 WHERE usuario_id = ? AND intentos < ? AND expira_en > NOW()',
      [usuario.id, VERIFICACION_MAX_INTENTOS]
    );
    if (intento.affectedRows === 0) return res.status(400).json({ error: CODIGO_VERIFICACION_INVALIDO });

    if (!codigoCoincide(codigo, usuario.id, usuario.codigo_hash)) {
      return res.status(400).json({ error: CODIGO_VERIFICACION_INVALIDO });
    }

    // Borrar el código y activar la cuenta van juntos y solo una vez: dos peticiones con el código correcto a la vez
    // no pueden activarla dos veces ni abrir dos sesiones.
    try {
      await enTransaccion(async (conn) => {
        const [borrado] = await conn.execute(
          'DELETE FROM verificaciones_correo WHERE usuario_id = ? AND codigo_hash = ?',
          [usuario.id, usuario.codigo_hash]
        );
        const [activada] = await conn.execute(
          'UPDATE usuarios SET correo_verificado = 1 WHERE id = ? AND correo_verificado = 0',
          [usuario.id]
        );
        if (borrado.affectedRows !== 1 || activada.affectedRows !== 1) throw new Error('VERIFICACION_YA_USADA');
      });
    } catch (err) {
      if (err.message === 'VERIFICACION_YA_USADA') return res.status(400).json({ error: CODIGO_VERIFICACION_INVALIDO });
      throw err;
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    await query('DELETE FROM tokens_sesion WHERE usuario_id = ? AND expira_en < NOW()', [usuario.id]);
    await query(
      'INSERT INTO tokens_sesion (usuario_id, token, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
      [usuario.id, token]
    );

    const { codigo_hash: _omitido, ...publico } = usuario;
    res.json({ mensaje: 'Correo verificado. ¡Bienvenido a Urbify!', token, usuario: publico });
  } catch (err) {
    return next(err);
  }
};

// Pide un código nuevo. Responde siempre igual (exista o no el correo, esté o no pendiente) y antes de trabajar.
exports.reenviarCodigo = async (req, res, next) => {
  const correo = normalizarCorreo(req.body?.correo);
  if (!EMAIL_REGEX.test(correo)) {
    return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido' });
  }
  res.json({ mensaje: MENSAJE_CODIGO_ENVIADO, expira_minutos: VERIFICACION_EXPIRA_MIN });

  try {
    const [filas] = await query(
      'SELECT id, nombre FROM usuarios WHERE correo = ? AND activo = 1 AND correo_verificado = 0',
      [correo]
    );
    if (filas.length === 0) return;
    await enviarCodigoDeVerificacion(filas[0].id, correo, filas[0].nombre, { respetarEspera: true });
  } catch (err) {
    console.error('No se pudo reenviar el código de verificación:', err.message);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ error: 'correo y contrasena son requeridos' });
    }

    const [usuarios] = await query(
      'SELECT id, nombre, apellido, correo, contrasena, telefono, rol, foto_url, direccion, latitud, longitud, correo_verificado FROM usuarios WHERE correo = ? AND activo = 1',
      [String(correo).trim().toLowerCase()]
    );
    if (usuarios.length === 0) {
      // Misma cantidad de trabajo que con una contraseña incorrecta: si no, responder en ~2 ms delata
      // (frente a ~100 ms) que la cuenta no existe.
      await hasher.compare(contrasena, HASH_FALSO);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];

    // Los intentos fallidos se limitan por IP y por cuenta en middleware/rateLimit.js, no con un
    // bloqueo de la cuenta: así un tercero no puede dejar fuera a otra persona solo escribiendo su correo.
    const valido = await hasher.compare(contrasena, usuario.contrasena);
    if (!valido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // La contraseña es correcta pero el correo nunca se verificó: no hay sesión hasta escribir el código.
    // (Solo se llega aquí con la contraseña correcta, así que esto no revela nada a un tercero.)
    if (!usuario.correo_verificado) {
      return res.status(403).json({
        error: 'Debes verificar tu correo para iniciar sesión',
        codigo: 'correo_no_verificado',
        correo: usuario.correo,
      });
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
    return next(err);
  }
};

// Paso 1: envía un código de 6 dígitos al correo. Siempre responde igual exista o no la cuenta
// (y antes de hacer el trabajo, para que ni el mensaje ni el tiempo revelen si el correo está registrado).
exports.olvidoContrasena = async (req, res, next) => {
  const correo = String(req.body?.correo || '').trim();
  if (!EMAIL_REGEX.test(correo)) {
    return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido' });
  }

  res.json({ mensaje: 'Si el correo está registrado, recibirás un código para restablecer tu contraseña' });

  try {
    const [usuarios] = await query('SELECT id, nombre FROM usuarios WHERE correo = ? AND activo = 1', [correo]);
    if (usuarios.length === 0) return;

    const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const codigoHash = await hasher.hash(codigo, 10);

    // Un solo código vigente por usuario: pedir otro invalida el anterior.
    await query('DELETE FROM recuperaciones_contrasena WHERE usuario_id = ?', [usuarios[0].id]);
    await query(
      'INSERT INTO recuperaciones_contrasena (usuario_id, codigo_hash, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
      [usuarios[0].id, codigoHash, CODIGO_EXPIRA_MIN]
    );

    await enviarCorreo({
      to: correo,
      textoDev: `código para restablecer la contraseña ${codigo}`,
      subject: 'Tu código para restablecer la contraseña de Urbify',
      html: `
        <h2>Restablecer contraseña</h2>
        <p>Hola ${escapeHtml(usuarios[0].nombre)},</p>
        <p>Tu código es: <strong style="font-size:24px;letter-spacing:4px">${codigo}</strong></p>
        <p>Vence en ${CODIGO_EXPIRA_MIN} minutos y solo sirve una vez. Si no lo pediste, ignora este correo.</p>
      `,
    });
  } catch (err) {
    console.error('Error en olvido de contraseña:', err.message);
  }
};

// Paso 2: valida el código y cambia la contraseña. Cierra todas las sesiones abiertas de la cuenta.
exports.restablecerContrasena = async (req, res, next) => {
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
    const coincide = await hasher.compare(codigo, recuperacion ? recuperacion.codigo_hash : HASH_FALSO);

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

    const hash = await hasher.hash(nueva, 10);
    await query(
      'UPDATE usuarios SET contrasena = ?, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?',
      [hash, recuperacion.usuario_id]
    );
    await query('DELETE FROM tokens_sesion WHERE usuario_id = ?', [recuperacion.usuario_id]);
    await query('DELETE FROM recuperaciones_contrasena WHERE usuario_id = ?', [recuperacion.usuario_id]);

    res.json({ mensaje: 'Contraseña actualizada. Inicia sesión con la nueva contraseña.' });
  } catch (err) {
    return next(err);
  }
};

// Invalida solo el token de esta petición (la sesión de este dispositivo);
// otras sesiones del mismo usuario siguen activas.
exports.logout = async (req, res, next) => {
  try {
    await query('DELETE FROM tokens_sesion WHERE token = ? AND usuario_id = ?', [req.token, req.usuarioId]);
    res.json({ mensaje: 'Sesión cerrada exitosamente' });
  } catch (err) {
    return next(err);
  }
};

exports.perfil = async (req, res, next) => {
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
    return next(err);
  }
};

exports.actualizarPerfil = async (req, res, next) => {
  try {
    const { nombre, apellido, telefono, direccion, latitud, longitud, foto_url, oficio } = req.body;

    const errorDir = errorDeDireccion(direccion);
    if (errorDir) return res.status(400).json({ error: errorDir });

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
    return next(err);
  }
};

exports.listarUsuarios = async (req, res, next) => {
  try {
    const [usuarios] = await query(
      'SELECT id, nombre, apellido, correo, telefono, rol, activo, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC'
    );
    res.json(usuarios);
  } catch (err) {
    return next(err);
  }
};

exports.usuarioPorId = async (req, res, next) => {
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
    return next(err);
  }
};

exports.eliminarUsuario = async (req, res, next) => {
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
    return next(err);
  }
};