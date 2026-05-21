const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Urbify2024!',
  database: process.env.DB_NAME || 'urbify_db',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const pool = new sql.ConnectionPool(config);

pool.connect().then(() => {
  console.log('Conectado a SQL Server');
}).catch(err => {
  console.error('Error al conectar a SQL Server:', err);
});

pool.on('error', err => {
  console.error('Error en el pool de SQL Server:', err);
});

const MAX = sql.NVarChar(sql.MAX);

async function query(sqlText, params = []) {
  const request = pool.request();
  let idx = 0;
  const parsedSql = sqlText.replace(/\?/g, () => `@p${idx++}`);
  params.forEach((val, i) => {
    if (val === null || val === undefined) {
      request.input(`p${i}`, MAX, null);
    } else {
      request.input(`p${i}`, val);
    }
  });
  const result = await request.query(parsedSql);
  return [result.recordset];
}

module.exports = { query };
