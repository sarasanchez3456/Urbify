// Historial de estados de una solicitud (quién la cambió y de qué estado a cuál).
// Es parte del cambio de estado, no información "de apoyo": se escribe con la MISMA conexión de la transacción
// que cambia el estado, y si falla el error se propaga para que se deshaga todo (no puede haber un estado
// cambiado sin su registro). `estadoAnterior` es null al crear la solicitud.
async function registrarHistorial(db, solicitudId, estadoAnterior, estadoNuevo, usuarioId) {
  await db.execute(
    'INSERT INTO solicitud_historial (solicitud_id, estado_anterior, estado_nuevo, usuario_id) VALUES (?, ?, ?, ?)',
    [solicitudId, estadoAnterior ?? null, estadoNuevo, usuarioId ?? null]
  );
}

module.exports = { registrarHistorial };
