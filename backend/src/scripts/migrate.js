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
    const [solicitudCols] = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes'"
    );
    const solicitudColumnNames = solicitudCols.map(c => c.COLUMN_NAME);
    if (!solicitudColumnNames.includes('tarifa_acordada')) {
      await query('ALTER TABLE solicitudes ADD COLUMN tarifa_acordada DECIMAL(10,2) NULL');
      console.log('Migración: tarifa_acordada agregada');
    }
    if (!solicitudColumnNames.includes('tipo_tarifa_acordada')) {
      await query('ALTER TABLE solicitudes ADD COLUMN tipo_tarifa_acordada VARCHAR(20) NULL');
      console.log('Migración: tipo_tarifa_acordada agregada');
    }

    const [tablasMensajes] = await query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mensajes_solicitud'"
    );
    if (tablasMensajes.length === 0) {
      await query(`CREATE TABLE mensajes_solicitud (
        id INT AUTO_INCREMENT PRIMARY KEY,
        solicitud_id INT NOT NULL,
        remitente_id INT NOT NULL,
        contenido VARCHAR(1000) NOT NULL,
        fecha_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        leido TINYINT(1) NOT NULL DEFAULT 0,
        FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
        FOREIGN KEY (remitente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_mensajes_solicitud_fecha (solicitud_id, fecha_envio)
      ) ENGINE=InnoDB`);
      console.log('Migración: tabla mensajes_solicitud creada');
    }

    console.log('Migración completada exitosamente');

  } catch (err) {
    console.log('Error en migración:', err.message);
  }
  process.exit();
}

migrate();
