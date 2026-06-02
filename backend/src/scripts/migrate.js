const { query } = require('../config/db');

async function migrate() {
  try {
    await query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'oficio'
      )
      ALTER TABLE usuarios ADD oficio NVARCHAR(100) NULL
    `);
    console.log('Migración 1/3: columna oficio agregada');

    await query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'intentos_fallidos'
      )
      ALTER TABLE usuarios ADD intentos_fallidos INT DEFAULT 0
    `);
    console.log('Migración 2/3: columna intentos_fallidos agregada');

    await query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'bloqueado_hasta'
      )
      ALTER TABLE usuarios ADD bloqueado_hasta DATETIME2 NULL
    `);
    console.log('Migración 3/3: columna bloqueado_hasta agregada');

    console.log('Migración completada exitosamente');
  } catch (err) {
    console.log('Error en migración:', err.message);
  }
  process.exit();
}

migrate();
