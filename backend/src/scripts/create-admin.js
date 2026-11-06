// Crea (o promueve) el primer administrador. Es la única vía para obtener el rol
// 'admin': el registro público solo acepta 'cliente' y 'proveedor'.
//
// Uso (las credenciales vienen del entorno, nunca del repositorio):
//   ADMIN_EMAIL=admin@ejemplo.com ADMIN_PASSWORD='una-clave-larga' npm run create-admin
// Opcionales: ADMIN_NOMBRE, ADMIN_APELLIDO.
// Si el correo ya existe, ese usuario pasa a rol admin y se actualiza su contraseña.
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 12;

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOMBRE, ADMIN_APELLIDO } = process.env;

  if (!ADMIN_EMAIL || !EMAIL_REGEX.test(ADMIN_EMAIL)) {
    throw new Error('ADMIN_EMAIL es requerido y debe ser un correo válido');
  }
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < MIN_PASSWORD) {
    throw new Error(`ADMIN_PASSWORD es requerido y debe tener al menos ${MIN_PASSWORD} caracteres`);
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const [existe] = await query('SELECT id FROM usuarios WHERE correo = ?', [ADMIN_EMAIL]);

  if (existe.length > 0) {
    await query(
      "UPDATE usuarios SET rol = 'admin', contrasena = ?, activo = 1, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?",
      [hash, existe[0].id]
    );
    // Cierra las sesiones abiertas con el rol anterior.
    await query('DELETE FROM tokens_sesion WHERE usuario_id = ?', [existe[0].id]);
    console.log(`Usuario ${ADMIN_EMAIL} promovido a admin`);
  } else {
    await query(
      "INSERT INTO usuarios (nombre, apellido, correo, contrasena, rol) VALUES (?, ?, ?, ?, 'admin')",
      [ADMIN_NOMBRE || 'Administrador', ADMIN_APELLIDO || 'Urbify', ADMIN_EMAIL, hash]
    );
    console.log(`Administrador ${ADMIN_EMAIL} creado`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
