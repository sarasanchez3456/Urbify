const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

exports.registrar = async (req, res) => {
  try {
    const { nombre, apellido, correo, contrasena, telefono, rol, direccion, latitud, longitud } = req.body;

    const [existe] = await pool.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (existe.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, correo, contrasena, telefono, rol, direccion, latitud, longitud)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, correo, hashedPassword, telefono || null, rol, direccion || null, latitud || null, longitud || null]
    );

    const token = jwt.sign(
      { id: result.insertId, rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await pool.query(
      'INSERT INTO tokens_sesion (usuario_id, token, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
      [result.insertId, token]
    );

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      token,
      usuario: { id: result.insertId, nombre, apellido, correo, rol },
    });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

exports.login = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    const [usuarios] = await pool.query('SELECT * FROM usuarios WHERE correo = ? AND activo = 1', [correo]);
    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];
    const valido = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!valido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await pool.query(
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

exports.perfil = async (req, res) => {
  try {
    const [usuarios] = await pool.query(
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

    await pool.query(
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
