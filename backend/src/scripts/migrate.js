const { query } = require('../config/db');

async function migrate() {
  try {
    const [cols] = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'"
    );
    const columnNames = cols.map(c => c.COLUMN_NAME);

    if (!columnNames.includes('oficio')) {
      await query('ALTER TABLE usuarios ADD COLUMN oficio VARCHAR(100) NULL');
      console.log('Migración 1/3: columna oficio agregada');
    } else {
      console.log('Migración 1/3: columna oficio ya existe');
    }

    if (!columnNames.includes('intentos_fallidos')) {
      await query('ALTER TABLE usuarios ADD COLUMN intentos_fallidos INT DEFAULT 0');
      console.log('Migración 2/3: columna intentos_fallidos agregada');
    } else {
      console.log('Migración 2/3: columna intentos_fallidos ya existe');
    }

    if (!columnNames.includes('bloqueado_hasta')) {
      await query('ALTER TABLE usuarios ADD COLUMN bloqueado_hasta DATETIME NULL');
      console.log('Migración 3/3: columna bloqueado_hasta agregada');
    } else {
      console.log('Migración 3/3: columna bloqueado_hasta ya existe');
    }

    console.log('Migración completada exitosamente');
  } catch (err) {
    console.log('Error en migración:', err.message);
  }
  process.exit();
}

migrate();
