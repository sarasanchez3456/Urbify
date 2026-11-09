// Registro de auditoría: cada acción de un administrador queda guardada (quién, qué, sobre qué, por qué).
const { query } = require('../config/db');

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

// El motivo de una acción sensible es obligatorio: entre 10 y 300 caracteres. Devuelve el texto limpio o null.
function motivoValido(valor) {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  return texto.length >= 10 && texto.length <= 300 ? texto : null;
}

module.exports = { registrarAuditoria, motivoValido };
