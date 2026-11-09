// Migración idempotente. La única fuente de verdad del esquema es
// src/config/schema.sql (el mismo archivo que carga Docker). Este script:
//   1) aplica schema.sql (CREATE ... IF NOT EXISTS: crea lo que falte), y
//   2) actualiza bases antiguas que ya existían sin ciertas columnas/índices,
//      porque CREATE TABLE IF NOT EXISTS no modifica tablas existentes.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { db: dbConfig } = require('../config/env');

const SCHEMA_PATH = path.join(__dirname, '..', 'config', 'schema.sql');
const DB_NAME = dbConfig.name;

// Columnas añadidas después de la primera versión del esquema.
const COLUMNAS = [
  { tabla: 'usuarios', nombre: 'oficio', ddl: 'oficio VARCHAR(100) NULL' },
  { tabla: 'usuarios', nombre: 'intentos_fallidos', ddl: 'intentos_fallidos INT DEFAULT 0' },
  { tabla: 'usuarios', nombre: 'bloqueado_hasta', ddl: 'bloqueado_hasta DATETIME NULL' },
  { tabla: 'usuarios', nombre: 'categoria_id', ddl: 'categoria_id INT NULL' },
  { tabla: 'solicitudes', nombre: 'tarifa_acordada', ddl: 'tarifa_acordada DECIMAL(10,2) NULL' },
  { tabla: 'solicitudes', nombre: 'tipo_tarifa_acordada', ddl: 'tipo_tarifa_acordada VARCHAR(20) NULL' },
  { tabla: 'calificaciones', nombre: 'motivos', ddl: 'motivos VARCHAR(120) NULL' },
  { tabla: 'calificaciones', nombre: 'oculta', ddl: 'oculta BOOLEAN NOT NULL DEFAULT 0' },
  { tabla: 'usuarios', nombre: 'verificado', ddl: 'verificado BOOLEAN NOT NULL DEFAULT 0' },
];

// Mismos índices que declara schema.sql.
const INDICES = [
  { tabla: 'usuarios', nombre: 'idx_usuarios_geo', columnas: 'latitud, longitud' },
  { tabla: 'usuarios', nombre: 'idx_usuarios_rol_activo', columnas: 'rol, activo' },
  { tabla: 'servicios', nombre: 'idx_servicios_categoria', columnas: 'categoria_id, disponible' },
  { tabla: 'servicios', nombre: 'idx_servicios_proveedor', columnas: 'proveedor_id' },
  { tabla: 'solicitudes', nombre: 'idx_solicitudes_cliente', columnas: 'cliente_id' },
  { tabla: 'solicitudes', nombre: 'idx_solicitudes_proveedor', columnas: 'proveedor_id' },
  { tabla: 'calificaciones', nombre: 'idx_calificaciones_proveedor', columnas: 'proveedor_id' },
  { tabla: 'tokens_sesion', nombre: 'idx_tokens_sesion_token', columnas: 'usuario_id, expira_en' },
];

// Las bases creadas antes solo aceptaban 'cliente' y 'proveedor' en usuarios.rol
// (CHECK con nombre automático). Se reemplaza por chk_usuarios_rol, que incluye 'admin'.
async function asegurarRolAdmin(conn) {
  // Bases creadas con el antiguo scripts/schema.sql tienen rol ENUM('cliente','proveedor'): el CHECK no basta,
  // la columna misma rechazaría 'admin' ("Data truncated"). Se convierte a VARCHAR(20), como en schema.sql.
  const [tipo] = await conn.query(
    "SELECT DATA_TYPE AS tipo FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'rol'",
    [DB_NAME]
  );
  if (tipo.length > 0 && String(tipo[0].tipo).toLowerCase() === 'enum') {
    await conn.query('ALTER TABLE usuarios MODIFY COLUMN rol VARCHAR(20) NOT NULL');
    console.log('Migración: usuarios.rol convertido de ENUM a VARCHAR(20)');
  }

  const [checks] = await conn.query(
    `SELECT cc.CONSTRAINT_NAME AS nombre, cc.CHECK_CLAUSE AS clausula
       FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
       JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
         ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
      WHERE tc.TABLE_SCHEMA = ? AND tc.TABLE_NAME = 'usuarios' AND tc.CONSTRAINT_TYPE = 'CHECK'
        AND cc.CHECK_CLAUSE LIKE '%rol%'`,
    [DB_NAME]
  );

  if (checks.some((c) => c.nombre === 'chk_usuarios_rol' && c.clausula.includes('admin'))) return;

  for (const { nombre } of checks) {
    await conn.query(`ALTER TABLE usuarios DROP CHECK \`${nombre}\``);
  }
  await conn.query(
    "ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_rol CHECK (rol IN ('cliente', 'proveedor', 'admin'))"
  );
  console.log('Migración: rol admin permitido en usuarios.rol');
}

async function migrate() {
  // Conexión propia con multipleStatements: schema.sql trae varias sentencias
  // y el pool de db.js usa prepared statements (una sola sentencia).
  let conn;
  try {
    conn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      multipleStatements: true,
      charset: 'utf8mb4',
    });
    await conn.query(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    console.log('Migración: schema.sql aplicado');

    for (const { tabla, nombre, ddl } of COLUMNAS) {
      const [rows] = await conn.query(
        'SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [DB_NAME, tabla, nombre]
      );
      if (rows.length === 0) {
        await conn.query(`ALTER TABLE \`${tabla}\` ADD COLUMN ${ddl}`);
        console.log(`Migración: columna ${tabla}.${nombre} agregada`);
      }
    }

    for (const { tabla, nombre, columnas } of INDICES) {
      const [rows] = await conn.query(
        'SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?',
        [DB_NAME, tabla, nombre]
      );
      if (rows.length === 0) {
        await conn.query(`CREATE INDEX \`${nombre}\` ON \`${tabla}\` (${columnas})`);
        console.log(`Migración: índice ${nombre} creado`);
      }
    }

    await asegurarRolAdmin(conn);

    // Historial de estados: las solicitudes anteriores a esta tabla reciben su fila de creación (con la fecha en que
    // se hicieron). Los cambios de estado anteriores no se pueden reconstruir: no hay de dónde sacar su fecha.
    // Idempotente: solo toca las solicitudes que aún no tienen ninguna fila.
    const [relleno] = await conn.query(
      `INSERT INTO solicitud_historial (solicitud_id, estado_anterior, estado_nuevo, usuario_id, fecha)
       SELECT s.id, NULL, 'pendiente', s.cliente_id, s.fecha_solicitud
         FROM solicitudes s
        WHERE NOT EXISTS (SELECT 1 FROM solicitud_historial h WHERE h.solicitud_id = s.id)`
    );
    if (relleno.affectedRows > 0) console.log(`Migración: historial de ${relleno.affectedRows} solicitudes inicializado`);

    console.log('Migración completada exitosamente');
  } catch (err) {
    // Sin stack ni "unhandled rejection": mensaje claro y código de salida 1 (también si la BD está caída).
    console.error(`Error en migración: ${err.code ? err.code + ' - ' : ''}${err.message}`);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

migrate();
