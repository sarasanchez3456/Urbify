// Registro de auditoría: cada acción de un administrador queda guardada (quién, qué, sobre qué, por qué).
const { query } = require('../config/db');
const { motivoValido } = require('./auditoria.pure');

// Es información de control: si no se puede guardar no debe deshacer la acción ya hecha, pero el error se registra.
async function registrarAuditoria(adminId, tipo, accion, objeto = '', motivo = null) {
  try {
    await query(
      'INSERT INTO auditoria (admin_id, tipo, accion, objeto, motivo) VALUES (?, ?, ?, ?, ?)',
      [adminId, tipo, String(accion).slice(0, 120), String(objeto).slice(0, 200), motivo ? String(motivo).slice(0, 300) : null]
    );
  } catch (err) {
    console.error('Error al registrar la auditoría:', err.message);
  }
}

module.exports = { registrarAuditoria, motivoValido };
