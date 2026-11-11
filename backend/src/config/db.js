const mysql = require('mysql2/promise');
const { db: dbConfig } = require('./env');
const avisos = require('../utils/avisos');

const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // Las fechas (DATETIME) se leen y escriben en UTC y se serializan como ISO 8601 con "Z".
  timezone: 'Z',
});

// Mismo huso en MySQL, para que NOW()/CURRENT_TIMESTAMP también queden en UTC aunque el servidor
// de base de datos use otra zona (p. ej. XAMPP en hora local).
pool.pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
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
  // mysql2 `execute` (prepared statements) lanza si algún parámetro es `undefined`.
  // Los controladores destructuran campos opcionales de req.body que pueden venir
  // sin definir; normalizamos undefined -> null para que se traduzca a SQL NULL.
  const safeParams = params.map((p) => (p === undefined ? null : p));
  const [result] = await pool.execute(sql, safeParams);
  // Al crear una notificación se avisa en vivo a su destinatario (ver utils/avisos.js).
  if (/^\s*INSERT\s+INTO\s+notificaciones/i.test(sql)) {
    const pos = avisos.posicionUsuario(sql);
    if (pos >= 0) avisos.avisar(safeParams[pos], { id: result.insertId });
  }
  return [result];
}

module.exports = { query, pool };

