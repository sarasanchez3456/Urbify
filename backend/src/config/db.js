const sql = require('mssql');
const net = require('net');
const { execSync } = require('child_process');
require('dotenv').config();

function getLocalDBPipe() {
  try {
    const out = execSync('sqllocaldb info MSSQLLocalDB', { encoding: 'utf8', timeout: 5000 });
    const lines = out.split(/\r?\n/);
    for (const line of lines) {
      if (line.includes('np:\\')) {
        const pipe = line.substring(line.indexOf('np:') + 3).trim();
        return pipe;
      }
    }
  } catch (e) {
    console.error('Error al obtener pipe de LocalDB:', e.message);
  }
  return null;
}

const pipePath = getLocalDBPipe();
if (!pipePath) {
  console.error('No se pudo obtener el pipe de LocalDB. Asegúrate de que LocalDB esté instalado y corriendo.');
  process.exit(1);
}

console.log(`Conectando a LocalDB: ${pipePath}`);

const config = {
  server: '.',
  options: {
    trustedConnection: true,
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 10000,
    connector: (connectOpts, lookup, signal) => {
      return new Promise((resolve, reject) => {
        const socket = net.createConnection(pipePath, () => resolve(socket));
        socket.on('error', (err) => reject(err));
      });
    },
    port: 1433,
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 60000,
  },
};

if (process.env.DB_NAME) {
  config.options.database = process.env.DB_NAME;
}

let pool;
let poolPromise;
let reconnecting = false;

async function getPool() {
  if (pool && pool.connected) {
    return pool;
  }
  if (poolPromise) {
    return poolPromise;
  }
  return createPool();
}

function createPool() {
  pool = new sql.ConnectionPool(config);
  poolPromise = pool.connect();

  poolPromise.then(() => {
    console.log('Conectado a SQL Server (LocalDB)');
    reconnecting = false;
  }).catch(err => {
    console.error('Error al conectar a SQL Server:', err);
    reconnecting = false;
  });

  pool.on('error', err => {
    console.error('Error en el pool de SQL Server, reconectando...', err);
    if (!reconnecting) {
      reconnecting = true;
      pool = null;
      poolPromise = null;
      setTimeout(createPool, 2000);
    }
  });

  return poolPromise;
}

createPool();

async function query(sqlText, params = []) {
  try {
    await getPool();
    const request = pool.request();
    let idx = 0;
    const parsedSql = sqlText.replace(/\?/g, () => `@p${idx++}`);
    params.forEach((val, i) => {
      request.input(`p${i}`, val === undefined ? null : val);
    });
    const result = await request.query(parsedSql);
    return [result.recordset];
  } catch (err) {
    if (err.code === 'ETIMEOUT' || err.code === 'ESOCKET') {
      console.error('Error de conexión, reintentando...');
      pool = null;
      poolPromise = null;
      await createPool();
      const request = pool.request();
      let idx = 0;
      const parsedSql = sqlText.replace(/\?/g, () => `@p${idx++}`);
      params.forEach((val, i) => {
        request.input(`p${i}`, val === undefined ? null : val);
      });
      const result = await request.query(parsedSql);
      return [result.recordset];
    }
    throw err;
  }
}

module.exports = { query };
