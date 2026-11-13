// Issue #37 (migraciones): `npm run migrate` sobre una base EXISTENTE y más antigua conserva los datos, crea lo que
// falta y se puede ejecutar de nuevo sin romper nada.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { DB, prepararBase } = require('./helpers');

const RAIZ = path.join(__dirname, '..', '..');
const NOMBRE = `${DB.name}_migra`;

const migrar = () => spawnSync(process.execPath, ['src/scripts/migrate.js'], {
  cwd: RAIZ,
  encoding: 'utf8',
  env: { ...process.env, NODE_ENV: 'test', DB_HOST: DB.host, DB_PORT: String(DB.port), DB_USER: DB.user, DB_PASSWORD: DB.password, DB_NAME: NOMBRE },
});

test('migraciones sobre una base existente (MySQL real)', async (t) => {
  await prepararBase(NOMBRE);
  const conn = await mysql.createConnection({ host: DB.host, port: DB.port, user: DB.user, password: DB.password, database: NOMBRE, multipleStatements: true, charset: 'utf8mb4' });
  t.after(async () => { await conn.query(`DROP DATABASE IF EXISTS \`${NOMBRE}\``); await conn.end(); });

  // ── Se deja la base "como era antes": sin las tablas, columnas, índices y claves foráneas que se agregaron después.
  const [fks] = await conn.query(
    `SELECT CONSTRAINT_NAME AS n FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notificaciones' AND COLUMN_NAME = 'solicitud_id' AND REFERENCED_TABLE_NAME = 'solicitudes'`, [NOMBRE]);
  for (const { n } of fks) await conn.query(`ALTER TABLE notificaciones DROP FOREIGN KEY \`${n}\``);
  await conn.query('DROP INDEX idx_notificaciones_solicitud ON notificaciones');
  await conn.query('ALTER TABLE notificaciones DROP COLUMN tipo, DROP COLUMN solicitud_id');
  await conn.query('ALTER TABLE calificaciones DROP COLUMN motivos, DROP COLUMN oculta');
  await conn.query('ALTER TABLE solicitudes DROP COLUMN tarifa_acordada, DROP COLUMN tipo_tarifa_acordada');
  await conn.query('DROP INDEX idx_usuarios_geo ON usuarios');
  await conn.query('DROP TABLE solicitud_historial, auditoria, reprogramaciones, disponibilidad_proveedor, verificaciones_correo');
  await conn.query('ALTER TABLE usuarios DROP COLUMN correo_verificado');

  // ── Datos existentes que deben sobrevivir.
  await conn.query(`
    INSERT INTO usuarios (id, nombre, apellido, correo, contrasena, rol) VALUES
      (1, 'Pablo', 'Proveedor', 'p@antiguo.test', 'hash', 'proveedor'), (2, 'Carla', 'Cliente', 'c@antiguo.test', 'hash', 'cliente');
    INSERT INTO servicios (id, proveedor_id, categoria_id, titulo, tarifa) VALUES (1, 1, 1, 'Arreglo de fugas', 50000);
    INSERT INTO solicitudes (id, cliente_id, proveedor_id, servicio_id, estado, fecha_solicitud) VALUES (1, 2, 1, 1, 'aceptada', '2026-01-05 10:00:00');
    INSERT INTO notificaciones (usuario_id, mensaje) VALUES
      (1, 'Nueva solicitud de Carla Cliente para el servicio "Arreglo de fugas"'),
      (1, 'El cliente Carla Cliente te envió un mensaje sobre "Arreglo de fugas": "Hola"');
  `);
  const contar = async (tabla) => Number((await conn.query(`SELECT COUNT(*) AS n FROM \`${tabla}\``))[0][0].n);
  const antes = { usuarios: await contar('usuarios'), servicios: await contar('servicios'), solicitudes: await contar('solicitudes'), notificaciones: await contar('notificaciones') };

  await t.test('la primera migración sale con código 0, agrega lo que faltaba y conserva los datos', async () => {
    const r = migrar();
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout, /Migración completada exitosamente/);

    for (const tabla of ['solicitud_historial', 'auditoria', 'reprogramaciones', 'disponibilidad_proveedor']) {
      assert.equal(Number((await conn.query('SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [NOMBRE, tabla]))[0][0].n), 1, `falta la tabla ${tabla}`);
    }
    const columnas = async (tabla) => (await conn.query('SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [NOMBRE, tabla]))[0].map((f) => f.c);
    assert.ok((await columnas('notificaciones')).includes('tipo') && (await columnas('notificaciones')).includes('solicitud_id'));
    assert.ok((await columnas('calificaciones')).includes('oculta') && (await columnas('calificaciones')).includes('motivos'));
    assert.ok((await columnas('solicitudes')).includes('tarifa_acordada') && (await columnas('solicitudes')).includes('tipo_tarifa_acordada'));

    const [indice] = await conn.query("SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND INDEX_NAME = 'idx_usuarios_geo'", [NOMBRE]);
    assert.ok(indice.length > 0, 'falta el índice idx_usuarios_geo');
    const [fk] = await conn.query(
      `SELECT rc.DELETE_RULE AS regla FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
         JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc ON rc.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME = k.CONSTRAINT_NAME
        WHERE k.TABLE_SCHEMA = ? AND k.TABLE_NAME = 'notificaciones' AND k.COLUMN_NAME = 'solicitud_id' AND k.REFERENCED_TABLE_NAME = 'solicitudes'`, [NOMBRE]);
    assert.equal(fk[0]?.regla, 'SET NULL', 'la clave foránea de notificaciones.solicitud_id debe ser ON DELETE SET NULL');

    // Los datos existentes siguen ahí.
    assert.deepEqual({ usuarios: await contar('usuarios'), servicios: await contar('servicios'), solicitudes: await contar('solicitudes'), notificaciones: await contar('notificaciones') }, antes);
    const [[u]] = await conn.query('SELECT correo FROM usuarios WHERE id = 1');
    assert.equal(u.correo, 'p@antiguo.test');
    assert.equal(Number((await conn.query('SELECT correo_verificado AS v FROM usuarios WHERE id = 1'))[0][0].v), 1, 'las cuentas que ya existían quedan con el correo verificado (si no, nadie podría iniciar sesión)');
    assert.equal(Number((await conn.query("SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'verificaciones_correo'", [NOMBRE]))[0][0].n), 1, 'falta la tabla verificaciones_correo');
  });

  await t.test('rellena el historial de las solicitudes anteriores y enlaza el aviso de mensaje con su solicitud', async () => {
    const [h] = await conn.query('SELECT estado_anterior, estado_nuevo FROM solicitud_historial WHERE solicitud_id = 1');
    assert.equal(h.length, 1);
    assert.equal(h[0].estado_anterior, null);
    assert.equal(h[0].estado_nuevo, 'pendiente');
    const [avisos] = await conn.query('SELECT tipo, solicitud_id FROM notificaciones ORDER BY id');
    assert.deepEqual(avisos.map((a) => a.tipo), ['general', 'mensaje']);
    assert.equal(avisos[1].solicitud_id, 1);
  });

  await t.test('ejecutarla otra vez no cambia nada y sigue saliendo con código 0 (idempotente)', async () => {
    const r = migrar();
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout, /Migración completada exitosamente/);
    assert.ok(!/agregada|creado|inicializado|enlazados|reemplazada/.test(r.stdout), `la segunda ejecución no debería modificar nada:\n${r.stdout}`);
    assert.deepEqual({ usuarios: await contar('usuarios'), servicios: await contar('servicios'), solicitudes: await contar('solicitudes'), notificaciones: await contar('notificaciones') }, antes);
    assert.equal(await contar('solicitud_historial'), 1, 'no debe duplicar el historial');
  });
});
