// Cancelación automática de citas vencidas.
//
// Regla: si pasa la hora de la visita (más una tolerancia) y la solicitud sigue "pendiente" (nadie la aceptó) o
// "aceptada" (el proveedor no la inició con el código), se cancela sola. Queda registrada en el historial de la
// solicitud, se avisa a las dos partes y se deja un reporte en la auditoría para que el administrador la vea.
//
// No hay un proceso permanente (en Vercel no existe), así que la revisión se hace al consultar las solicitudes:
// cada instancia la repite como máximo una vez por minuto.
const { pool } = require('../config/db');
const { registrarHistorial } = require('./historial');
const { registrarAuditoria } = require('./auditoria');

const TOLERANCIA_MIN = Math.max(0, Number(process.env.AUTO_CANCEL_TOLERANCIA_MIN ?? 30) || 0);
const PAUSA_ENTRE_REVISIONES_MS = 60 * 1000;
const MAX_POR_REVISION = 50;

let ultimaRevision = 0;

const MENSAJES = {
  pendiente: (titulo) => ({
    cliente: `Tu solicitud de "${titulo}" se canceló sola: llegó la hora de la visita y el proveedor no la había aceptado.`,
    proveedor: `La solicitud de "${titulo}" se canceló sola: llegó la hora de la visita y no la aceptaste.`,
  }),
  aceptada: (titulo) => ({
    cliente: `Tu cita de "${titulo}" se canceló sola: pasó la hora y el servicio no se inició con el código. Puedes pedir otra cita.`,
    proveedor: `La cita de "${titulo}" se canceló sola: pasó la hora y no iniciaste el servicio con el código del cliente.`,
  }),
};

// Cancela las solicitudes vencidas. Devuelve cuántas canceló. Nunca lanza: un fallo aquí no debe romper la consulta.
async function cancelarVencidas({ forzar = false, ahoraMs = Date.now() } = {}) {
  if (!forzar && ahoraMs - ultimaRevision < PAUSA_ENTRE_REVISIONES_MS) return 0;
  ultimaRevision = ahoraMs;
  let canceladas = 0;
  try {
    const [vencidas] = await pool.execute(
      `SELECT sol.id, sol.estado, sol.cliente_id, sol.proveedor_id, sol.fecha_servicio, s.titulo
       FROM solicitudes sol JOIN servicios s ON s.id = sol.servicio_id
       WHERE sol.estado IN ('pendiente', 'aceptada') AND sol.fecha_servicio IS NOT NULL
         AND sol.fecha_servicio < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE)
       ORDER BY sol.fecha_servicio LIMIT ${MAX_POR_REVISION}`,
      [TOLERANCIA_MIN]
    );
    for (const sol of vencidas) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        // El estado anterior va en el WHERE: si alguien la aceptó, inició o canceló entre la lectura y ahora, no se toca.
        const [r] = await conn.execute('UPDATE solicitudes SET estado = ? WHERE id = ? AND estado = ?', ['cancelada', sol.id, sol.estado]);
        if (r.affectedRows === 0) { await conn.rollback(); continue; }
        await registrarHistorial(conn, sol.id, sol.estado, 'cancelada', null);
        await conn.execute("UPDATE reprogramaciones SET estado = 'cancelada', fecha_respuesta = NOW() WHERE solicitud_id = ? AND estado = 'pendiente'", [sol.id]);
        const msg = MENSAJES[sol.estado](sol.titulo);
        for (const [usuario, modo, mensaje] of [[sol.cliente_id, 'cliente', msg.cliente], [sol.proveedor_id, 'proveedor', msg.proveedor]]) {
          await conn.execute(
            "INSERT INTO notificaciones (tipo, solicitud_id, usuario_id, modo, mensaje) VALUES ('solicitud', ?, ?, ?, ?)",
            [sol.id, usuario, modo, mensaje]
          );
        }
        await registrarAuditoria(
          conn, null, 'solicitud', 'Cancelación automática', `Solicitud N.º ${sol.id}`,
          sol.estado === 'aceptada' ? 'Pasó la hora de la cita y no se inició con el código' : 'Pasó la hora de la cita sin que el proveedor la aceptara'
        );
        await conn.commit();
        canceladas += 1;
      } catch (err) {
        await conn.rollback().catch(() => {});
        console.error(`No se pudo cancelar la solicitud vencida ${sol.id}:`, err.message);
      } finally {
        conn.release();
      }
    }
  } catch (err) {
    console.error('Error al revisar solicitudes vencidas:', err.message);
  }
  return canceladas;
}

module.exports = { cancelarVencidas, TOLERANCIA_MIN };
