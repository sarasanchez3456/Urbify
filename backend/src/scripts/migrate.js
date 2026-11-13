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
  // Las notificaciones existentes se mantienen y reciben el tipo por defecto "general".
  { tabla: 'notificaciones', nombre: 'tipo', ddl: "tipo VARCHAR(50) NOT NULL DEFAULT 'general'" },
  { tabla: 'notificaciones', nombre: 'solicitud_id', ddl: 'solicitud_id INT NULL' },
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
  { tabla: 'notificaciones', nombre: 'idx_notificaciones_solicitud', columnas: 'solicitud_id' },
];

// El schema crea esta FK en instalaciones nuevas. Esta comprobación la agrega en bases existentes y
// corrige una FK previa que no preserve el historial con ON DELETE SET NULL.
async function asegurarFkNotificacionesSolicitud(conn) {
  const [claves] = await conn.query(
    `SELECT kcu.CONSTRAINT_NAME AS nombre, rc.DELETE_RULE AS regla_borrado
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
       LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
         ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
        AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      WHERE kcu.TABLE_SCHEMA = ? AND kcu.TABLE_NAME = 'notificaciones'
        AND kcu.COLUMN_NAME = 'solicitud_id' AND kcu.REFERENCED_TABLE_NAME = 'solicitudes'`,
    [DB_NAME]
  );

  if (claves.some((clave) => clave.regla_borrado === 'SET NULL')) return;

  for (const { nombre } of claves) {
    await conn.query(`ALTER TABLE notificaciones DROP FOREIGN KEY \`${nombre}\``);
    console.log(`Migración: FK ${nombre} de notificaciones.solicitud_id reemplazada`);
  }
  await conn.query(
    `ALTER TABLE notificaciones
       ADD CONSTRAINT fk_notificaciones_solicitud
       FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE SET NULL`
  );
  console.log('Migración: FK notificaciones.solicitud_id creada con ON DELETE SET NULL');
}

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

// Verificación de correo: las bases creadas antes no tienen usuarios.correo_verificado. Al agregar la columna, las
// cuentas que ya existían se marcan como verificadas (ya iniciaban sesión; si no, nadie podría entrar). Solo ocurre una
// vez: cuando la columna no existe todavía. Las cuentas nuevas nacen sin verificar (DEFAULT 0 en schema.sql).
async function asegurarCorreoVerificado(conn) {
  const [existe] = await conn.query(
    "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'correo_verificado'",
    [DB_NAME]
  );
  if (existe.length > 0) return;
  await conn.query('ALTER TABLE usuarios ADD COLUMN correo_verificado BOOLEAN NOT NULL DEFAULT 0');
  const [r] = await conn.query('UPDATE usuarios SET correo_verificado = 1');
  console.log(`Migración: usuarios.correo_verificado agregada; ${r.affectedRows} cuentas existentes marcadas como verificadas`);
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
      ...(dbConfig.ssl ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {}),
    });
    // schema.sql trae el nombre "urbify_db" escrito (CREATE DATABASE / USE): se cambia por la base configurada en
    // DB_NAME, para que la migración nunca toque otra base distinta de la que usa el servidor.
    const esquema = fs.readFileSync(SCHEMA_PATH, 'utf8').replace(/\burbify_db\b/g, () => DB_NAME);
    await conn.query(esquema);
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

    await asegurarCorreoVerificado(conn);
    await asegurarFkNotificacionesSolicitud(conn);
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

    // Avisos de mensajes anteriores al enlace con la solicitud: el texto trae el título del servicio
    // ('... te envió un mensaje sobre "Título": "..."'). Solo se enlazan los que coinciden con UNA sola solicitud del
    // destinatario; los ambiguos se dejan como estaban (abren Mis Solicitudes). Idempotente: solo toca tipo 'general'.
    const [enlazados] = await conn.query(
      `UPDATE notificaciones n
         JOIN (
           SELECT n2.id AS nid, MIN(sol.id) AS sid, COUNT(*) AS c
             FROM notificaciones n2
             JOIN solicitudes sol ON (sol.cliente_id = n2.usuario_id OR sol.proveedor_id = n2.usuario_id)
             JOIN servicios sv ON sv.id = sol.servicio_id
            WHERE n2.tipo = 'general' AND n2.solicitud_id IS NULL
              AND n2.mensaje LIKE '%te envió un mensaje sobre "%'
              AND sv.titulo = SUBSTRING_INDEX(SUBSTRING(n2.mensaje, LOCATE('sobre "', n2.mensaje) + 7), '": "', 1)
            GROUP BY n2.id
         ) x ON x.nid = n.id AND x.c = 1
          SET n.tipo = 'mensaje', n.solicitud_id = x.sid`
    );
    if (enlazados.affectedRows > 0) console.log(`Migración: ${enlazados.affectedRows} avisos de mensajes enlazados a su solicitud`);

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
