const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
require('dotenv').config();

exports.registrar = async (req, res) => {
  try {
    const { nombre, apellido, correo, contrasena, telefono, rol, direccion, latitud, longitud, oficio } = req.body;

    if (!nombre || !apellido || !correo || !contrasena) {
      return res.status(400).json({ error: 'nombre, apellido, correo y contrasena son requeridos' });
    }
    if (!rol || !['cliente', 'proveedor'].includes(rol)) {
      return res.status(400).json({ error: 'rol debe ser cliente o proveedor' });
    }

    const [existe] = await query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (existe.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const [result] = await query(
      `INSERT INTO usuarios (nombre, apellido, correo, contrasena, telefono, rol, direccion, latitud, longitud, oficio)
       OUTPUT INSERTED.id
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, correo, hashedPassword, telefono || null, rol, direccion || null, latitud || null, longitud || null, oficio || null]
    );

    const usuarioId = result[0].id;

    const token = jwt.sign(
      { id: usuarioId, rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await query(
      'DELETE FROM tokens_sesion WHERE usuario_id = ? AND expira_en < GETDATE()',
      [usuarioId]
    );
    await query(
      'INSERT INTO tokens_sesion (usuario_id, token, expira_en) VALUES (?, ?, DATEADD(DAY, 7, GETDATE()))',
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

    const [usuarios] = await query('SELECT * FROM usuarios WHERE correo = ? AND activo = 1', [correo]);
    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];

    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
      const restante = Math.ceil((new Date(usuario.bloqueado_hasta) - new Date()) / 60000);
      return res.status(429).json({
        error: `Demasiados intentos fallidos. Intenta de nuevo en ${restante} minuto${restante !== 1 ? 's' : ''}.`,
        bloqueado: true,
        minutos_restantes: restante,
      });
    }

    const valido = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!valido) {
      const [updateResult] = await query(
        `UPDATE usuarios SET intentos_fallidos = intentos_fallidos + 1
         OUTPUT INSERTED.intentos_fallidos
         WHERE id = ?`,
        [usuario.id]
      );
      const nuevosIntentos = updateResult[0].intentos_fallidos;

      if (nuevosIntentos >= 3) {
        await query(
          'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = DATEADD(MINUTE, 5, GETDATE()) WHERE id = ?',
          [usuario.id]
        );
        return res.status(429).json({
          error: 'Demasiados intentos fallidos. Cuenta bloqueada por 5 minutos.',
          bloqueado: true,
          minutos_restantes: 5,
          intentos_restantes: 0,
        });
      }

      return res.status(401).json({
        error: `Credenciales inválidas. Te quedan ${3 - nuevosIntentos} intento${3 - nuevosIntentos !== 1 ? 's' : ''}.`,
        intentos_restantes: 3 - nuevosIntentos,
      });
    }

    await query('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?', [usuario.id]);

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await query(
      'DELETE FROM tokens_sesion WHERE usuario_id = ? AND expira_en < GETDATE()',
      [usuario.id]
    );
    await query(
      'INSERT INTO tokens_sesion (usuario_id, token, expira_en) VALUES (?, ?, DATEADD(DAY, 7, GETDATE()))',
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

exports.perfil = async (req, res) => {
  try {
    const [usuarios] = await query(
      `SELECT id, nombre, apellido, correo, telefono, rol, foto_url, direccion, latitud, longitud, creado_en
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
    const { nombre, apellido, telefono, direccion, latitud, longitud, foto_url } = req.body;

    await query(
      `UPDATE usuarios SET nombre = COALESCE(?, nombre), apellido = COALESCE(?, apellido),
       telefono = COALESCE(?, telefono), direccion = COALESCE(?, direccion),
       latitud = COALESCE(?, latitud), longitud = COALESCE(?, longitud),
       foto_url = COALESCE(?, foto_url)
       WHERE id = ?`,
      [nombre, apellido, telefono, direccion, latitud, longitud, foto_url, req.usuarioId]
    );

    res.json({ mensaje: 'Perfil actualizado exitosamente' });
  } catch (err) {
    console.error('Error al actualizar perfil:', err);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

exports.listarUsuarios = async (req, res) => {
  try {
    const [usuarios] = await query(
      `SELECT id, nombre, apellido, correo, telefono, rol, activo, creado_en FROM usuarios ORDER BY creado_en DESC`
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
      `SELECT id, nombre, apellido, correo, telefono, rol, foto_url, direccion, latitud, longitud, oficio, activo, creado_en FROM usuarios WHERE id = ?`,
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
    const [existe] = await query('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    await query('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ mensaje: 'Usuario eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};
