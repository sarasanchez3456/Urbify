// Ejecuta `fn(conexion)` dentro de una transacción: si `fn` termina bien se confirma (COMMIT) y si lanza un
// error se deshace todo (ROLLBACK) y el error se vuelve a lanzar. Úsala cuando varias escrituras forman un único
// cambio de negocio (por ejemplo, un cambio de estado y su registro en el historial).
//
// Dentro de `fn` hay que usar la conexión recibida (`conn.execute`), no `query()`: `query()` toma otra conexión
// del pool y quedaría fuera de la transacción.
const { pool } = require('../config/db');

async function enTransaccion(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { enTransaccion };
