// Base común de las pruebas de integración: levanta el servidor REAL (node src/index.js) contra una base MySQL
// de pruebas que se crea desde cero con config/schema.sql, y ofrece ayudas para crear usuarios, servicios y
// solicitudes por la API. Nada se simula: las pruebas comprueban el comportamiento real de MySQL.
//
// Variables (todas opcionales; los valores por defecto sirven con el MySQL de docker-compose o de CI):
//   DB_HOST (127.0.0.1) · DB_PORT (3306) · DB_USER (root) · DB_PASSWORD ('') · TEST_DB_NAME (urbify_test) · TEST_PORT (4100)
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const RAIZ = path.join(__dirname, '..', '..');
const DB = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  name: process.env.TEST_DB_NAME || 'urbify_test',
};
const PUERTO = Number(process.env.TEST_PORT || 4100);
const URL_BASE = `http://127.0.0.1:${PUERTO}/api`;

const conexionAdmin = () => mysql.createConnection({
  host: DB.host, port: DB.port, user: DB.user, password: DB.password, multipleStatements: true, charset: 'utf8mb4',
});

// Borra y vuelve a crear la base de pruebas con el esquema actual.
async function prepararBase(nombre = DB.name) {
  const conn = await conexionAdmin();
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${nombre}\``);
    const sql = fs.readFileSync(path.join(RAIZ, 'src', 'config', 'schema.sql'), 'utf8').replace(/urbify_db/g, nombre);
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}

// Pool para consultar o preparar datos directamente en la base de pruebas.
function abrirPool() {
  return mysql.createPool({
    host: DB.host, port: DB.port, user: DB.user, password: DB.password, database: DB.name,
    waitForConnections: true, connectionLimit: 5, charset: 'utf8mb4', timezone: 'Z',
  });
}

// Arranca el servidor y espera a que responda. Devuelve { detener, logs }.
async function arrancarServidor() {
  const logs = [];
  const proceso = spawn(process.execPath, ['src/index.js'], {
    cwd: RAIZ,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(PUERTO),
      DB_HOST: DB.host, DB_PORT: String(DB.port), DB_USER: DB.user, DB_PASSWORD: DB.password, DB_NAME: DB.name,
      JWT_SECRET: 'clave-de-pruebas-de-integracion-0123456789-abcdef',
      CORS_ORIGIN: 'http://localhost',
      // Las pruebas crean muchos usuarios y peticiones desde la misma IP: se suben los límites.
      RATE_LIMIT_GLOBAL: '100000', RATE_LIMIT_PUBLIC_PER_MINUTE: '100000', RATE_LIMIT_REGISTER_PER_HOUR: '100000',
      RATE_LIMIT_LOGIN_IP: '100000', RATE_LIMIT_LOGIN_ACCOUNT_IP: '100000', RATE_LIMIT_LOGIN_ACCOUNT: '100000',
      RESEND_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proceso.stdout.on('data', (d) => logs.push(String(d)));
  proceso.stderr.on('data', (d) => logs.push(String(d)));
  let salio = false;
  proceso.on('exit', () => { salio = true; });

  const limite = Date.now() + 30000;
  for (;;) {
    if (salio) throw new Error(`El servidor se cerró al arrancar:\n${logs.join('')}`);
    try {
      const r = await fetch(`${URL_BASE}/health?deep=1`);
      if (r.ok) break;
    } catch { /* aún no escucha */ }
    if (Date.now() > limite) { proceso.kill(); throw new Error(`El servidor no respondió en 30 s:\n${logs.join('')}`); }
    await new Promise((r) => setTimeout(r, 300));
  }
  return {
    logs,
    detener: () => new Promise((resolver) => {
      if (salio) return resolver();
      proceso.once('exit', resolver);
      proceso.kill();
    }),
  };
}

// Petición a la API. Devuelve { status, body } (body es JSON o null).
async function api(metodo, ruta, { token, body } = {}) {
  const r = await fetch(`${URL_BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let cuerpo = null;
  try { cuerpo = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, body: cuerpo };
}

let contador = 0;
const unico = () => `${Date.now().toString(36)}${(contador += 1)}`;

// Registra un usuario por la API. Devuelve { id, token, correo, rol }.
async function registrar(rol, extra = {}) {
  const correo = `${rol}.${unico()}@pruebas.test`;
  const r = await api('POST', '/auth/registro', {
    body: { nombre: rol === 'cliente' ? 'Carla' : 'Pablo', apellido: 'Prueba', correo, contrasena: 'Clave-de-pruebas-1', rol, telefono: '+573001234567', ...extra },
  });
  if (r.status !== 201) throw new Error(`No se pudo registrar ${rol}: ${r.status} ${JSON.stringify(r.body)}`);
  return { id: r.body.usuario.id, token: r.body.token, correo, rol };
}

// Convierte un usuario ya registrado en administrador (el rol se lee de la base en cada petición).
async function volverAdmin(pool, usuario) {
  await pool.execute("UPDATE usuarios SET rol = 'admin' WHERE id = ?", [usuario.id]);
  return { ...usuario, rol: 'admin' };
}

async function crearServicio(proveedor, extra = {}) {
  const r = await api('POST', '/servicios', { token: proveedor.token, body: { categoria_id: 1, titulo: 'Servicio de pruebas', tarifa: 50000, tipo_tarifa: 'hora', ...extra } });
  if (r.status !== 201) throw new Error(`No se pudo crear el servicio: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.id ?? r.body.servicio?.id;
}

// ── Fechas en hora de Colombia (UTC-5), como las usa el backend ──
// fechaColombia(3, '10:00') -> "AAAA-MM-DDT10:00:00-05:00" dentro de 3 días (a las 10:00 de Colombia).
function fechaColombia(diasAdelante, hhmm) {
  const base = new Date(Date.now() + diasAdelante * 86400000 - 5 * 3600000);
  const ymd = base.toISOString().slice(0, 10);
  return `${ymd}T${hhmm}:00-05:00`;
}
const diaSemana = (fechaIso) => new Date(`${fechaIso.slice(0, 10)}T12:00:00Z`).getUTCDay();

// Crea una solicitud por la API. Devuelve la respuesta completa; el id está en body.solicitud.id.
const solicitar = (cliente, servicioId, fecha, extra = {}) =>
  api('POST', '/solicitudes', { token: cliente.token, body: { servicio_id: servicioId, descripcion: 'Prueba', fecha_servicio: fecha, ...extra } });

// Crea una solicitud y la deja en el estado pedido recorriendo transiciones válidas.
async function solicitudEn(estado, { cliente, proveedor, servicioId, fecha }) {
  const r = await solicitar(cliente, servicioId, fecha);
  if (r.status !== 201) throw new Error(`No se pudo crear la solicitud: ${r.status} ${JSON.stringify(r.body)}`);
  const id = r.body.solicitud.id;
  const ruta = { pendiente: [], aceptada: ['aceptada'], en_proceso: ['aceptada', 'en_proceso'], completada: ['aceptada', 'en_proceso', 'completada'] }[estado];
  for (const e of ruta) {
    const c = await api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: e } });
    if (c.status !== 200) throw new Error(`Transición a ${e} falló: ${c.status} ${JSON.stringify(c.body)}`);
  }
  return id;
}

// Prepara todo lo que necesita un archivo de pruebas: base limpia, servidor y pool. `cerrar()` lo deja todo apagado.
async function iniciarEntorno() {
  await prepararBase();
  const pool = abrirPool();
  const servidor = await arrancarServidor();
  return { pool, servidor, cerrar: async () => { await servidor.detener(); await pool.end(); } };
}

// Crea un trigger que hace fallar el INSERT en `tabla` cuando `condicion` es verdadera (usa NEW.<columna>).
// Sirve para simular que una escritura secundaria falla y comprobar que todo se deshace. Devuelve `quitar()`.
async function hacerFallar(pool, tabla, condicion = '1 = 1') {
  const nombre = `tg_falla_${tabla}`;
  await pool.query(`DROP TRIGGER IF EXISTS ${nombre}`);
  await pool.query(
    `CREATE TRIGGER ${nombre} BEFORE INSERT ON ${tabla} FOR EACH ROW
     BEGIN IF ${condicion} THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fallo simulado por la prueba'; END IF; END`
  );
  return () => pool.query(`DROP TRIGGER IF EXISTS ${nombre}`);
}

const contar = async (pool, sql, params = []) => Number((await pool.execute(sql, params))[0][0].n);

module.exports = {
  DB, URL_BASE, prepararBase, abrirPool, arrancarServidor, api, registrar, volverAdmin, crearServicio,
  fechaColombia, diaSemana, solicitar, solicitudEn, iniciarEntorno, hacerFallar, contar,
};
