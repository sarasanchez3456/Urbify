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

pool.getConnection()
  .then(conn => {
    console.log('Conectado a MySQL');
    conn.release();
  })
  .catch(err => {
    console.error('Error al conectar a MySQL:', err.message);
  });

async function query(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return [result];
}

module.exports = { query, pool };
