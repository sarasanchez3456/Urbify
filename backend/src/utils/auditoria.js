// Registro de auditoría: cada acción de un administrador queda guardada (quién, qué, sobre qué, por qué).
// La auditoría es obligatoria: se escribe con la MISMA conexión de la transacción que hace la acción, y si falla
// el error se propaga para que se deshaga todo (no puede haber una acción sensible sin su registro).
const { motivoValido } = require('./auditoria.pure');

async function registrarAuditoria(db, adminId, tipo, accion, objeto = '', motivo = null) {
  await db.execute(
    'INSERT INTO auditoria (admin_id, tipo, accion, objeto, motivo) VALUES (?, ?, ?, ?, ?)',
    [adminId, tipo, String(accion).slice(0, 120), String(objeto).slice(0, 200), motivo ? String(motivo).slice(0, 300) : null]
  );
}

module.exports = { registrarAuditoria, motivoValido };
