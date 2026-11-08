// Migración idempotente. La única fuente de verdad del esquema es
// src/config/schema.sql (el mismo archivo que carga Docker). Este script:
//   1) aplica schema.sql (CREATE ... IF NOT EXISTS: crea lo que falte), y
//   2) actualiza bases antiguas que ya existían sin ciertas columnas/índices,
//      porque CREATE TABLE IF NOT EXISTS no modifica tablas existentes.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const SCHEMA_PATH = path.join(__dirname, '..', 'config', 'schema.sql');
const DB_NAME = process.env.DB_NAME || 'urbify_db';

// Columnas añadidas después de la primera versión del esquema.
const COLUMNAS = [
  { tabla: 'usuarios', nombre: 'oficio', ddl: 'oficio VARCHAR(100) NULL' },
  { tabla: 'usuarios', nombre: 'intentos_fallidos', ddl: 'intentos_fallidos INT DEFAULT 0' },
  { tabla: 'usuarios', nombre: 'bloqueado_hasta', ddl: 'bloqueado_hasta DATETIME NULL' },
  { tabla: 'usuarios', nombre: 'categoria_id', ddl: 'categoria_id INT NULL' },
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

async function migrate() {
  // Conexión propia con multipleStatements: schema.sql trae varias sentencias
  // y el pool de db.js usa prepared statements (una sola sentencia).
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
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

    console.log('Migración completada exitosamente');
  } catch (err) {
    console.error('Error en migración:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

migrate();
