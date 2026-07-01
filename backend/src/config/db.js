const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'urbify_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

// Reintenta la conexión hasta MAX_INTENTOS veces con una pausa entre cada uno.
// Esto es necesario en Docker: el backend arranca mientras MySQL aún inicializa.
const MAX_INTENTOS = 5;
const PAUSA_MS    = 3000; // 3 segundos entre intentos

async function conectarConReintentos(intento = 1) {
  try {
    const conn = await pool.getConnection();
    console.log(`✅ Conectado a MySQL (intento ${intento}/${MAX_INTENTOS})`);
    conn.release();
  } catch (err) {
    if (intento < MAX_INTENTOS) {
      console.log(`⏳ MySQL no disponible aún, reintentando en ${PAUSA_MS / 1000}s... (${intento}/${MAX_INTENTOS})`);
      await new Promise(resolve => setTimeout(resolve, PAUSA_MS));
      await conectarConReintentos(intento + 1);
    } else {
      console.error(`❌ No se pudo conectar a MySQL tras ${MAX_INTENTOS} intentos:`, err.message);
    }
  }
}

conectarConReintentos();

async function query(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return [result];
}

module.exports = { query, pool };

