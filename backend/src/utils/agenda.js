// Agenda de los proveedores: horarios en los que atienden, horas ocupadas y reserva sin choques.
//
// Reglas (decididas con el equipo):
//  - Cada cita ocupa UNA hora a partir de su fecha_servicio. Dos citas del mismo proveedor chocan si empiezan con
//    menos de 60 minutos de diferencia.
//  - Ocupan agenda las solicitudes en estado pendiente, aceptada o en_proceso, y las fechas propuestas por
//    reprogramaciones pendientes (así otro cliente no puede elegir una hora que alguien ya pidió).
//  - Si el proveedor configuró su horario semanal, solo se puede reservar dentro de él. Si no lo configuró, la
//    reserva sigue siendo libre (como antes), pero el choque con otras citas siempre se comprueba.
//  - Las horas se calculan en hora de Colombia (UTC-5, sin horario de verano), igual que el resto del backend.
const { pool } = require('../config/db');

const OFFSET_MS = 5 * 60 * 60 * 1000;
const DURACION_MIN = 60;
const DURACION_MS = DURACION_MIN * 60 * 1000;
const ANTICIPACION_MIN = 60; // no se ofrecen horas que empiezan en menos de una hora
const ESTADOS_ACTIVOS_SQL = "('pendiente', 'aceptada', 'en_proceso')";
// Horario que se ofrece mientras el proveedor no configura el suyo: todos los días de 8:00 a 18:00.
const HORARIO_POR_DEFECTO = { inicio: '08:00', fin: '18:00' };

// ── Conversión de fechas (hora de Colombia) ──
const aLocal = (ms) => new Date(ms - OFFSET_MS); // se leen con los getUTC*
const fechaLocal = (ms) => aLocal(ms).toISOString().slice(0, 10); // AAAA-MM-DD en Colombia
const diaSemanaLocal = (ms) => aLocal(ms).getUTCDay();
const minutosLocal = (ms) => {
  const d = aLocal(ms);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};
const desdeLocal = (fechaISO, minutos) => {
  const [y, m, d] = fechaISO.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 0, minutos) + OFFSET_MS;
};
const diaSemanaDeFecha = (fechaISO) => {
  const [y, m, d] = fechaISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
const textoAMinutos = (texto) => {
  const [h, m] = String(texto).split(':');
  return Number(h) * 60 + Number(m || 0);
};
const minutosATexto = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const aFechaMysqlUtc = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

// Un valor SIN zona (p. ej. "2026-12-01 10:00:00" de la app móvil) se interpreta como hora de Colombia; uno con zona
// ("...Z" o "...-05:00") se respeta. Devuelve milisegundos, o null si no es una fecha válida.
function parsearFecha(valor) {
  if (typeof valor !== 'string') return null;
  let texto = valor.trim().replace(' ', 'T');
  if (!texto) return null;
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(texto)) texto += '-05:00';
  const ms = Date.parse(texto);
  return Number.isNaN(ms) ? null : ms;
}

// `db` puede ser el pool o una conexión de una transacción: los dos tienen `execute`.
async function leerDisponibilidad(db, proveedorId) {
  const [filas] = await db.execute(
    `SELECT dia_semana, TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio, TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin
       FROM disponibilidad_proveedor
      WHERE proveedor_id = ?
      ORDER BY dia_semana, hora_inicio`,
    [proveedorId]
  );
  return filas;
}

// Inicios (en ms) de las citas y propuestas que ocupan la agenda del proveedor entre dos instantes.
// excluirSolicitudId: no cuenta esa solicitud (ni su propuesta pendiente), para poder reprogramarla a una hora cercana.
async function ocupaciones(db, proveedorId, desdeMs, hastaMs, excluirSolicitudId = 0) {
  const [citas] = await db.execute(
    `SELECT fecha_servicio
       FROM solicitudes
      WHERE proveedor_id = ? AND estado IN ${ESTADOS_ACTIVOS_SQL} AND fecha_servicio IS NOT NULL
        AND fecha_servicio > ? AND fecha_servicio < ? AND id <> ?`,
    [proveedorId, aFechaMysqlUtc(desdeMs), aFechaMysqlUtc(hastaMs), excluirSolicitudId]
  );
  const [propuestas] = await db.execute(
    `SELECT r.fecha_propuesta
       FROM reprogramaciones r
       JOIN solicitudes s ON s.id = r.solicitud_id
      WHERE s.proveedor_id = ? AND r.estado = 'pendiente' AND s.estado IN ${ESTADOS_ACTIVOS_SQL}
        AND r.fecha_propuesta > ? AND r.fecha_propuesta < ? AND r.solicitud_id <> ?`,
    [proveedorId, aFechaMysqlUtc(desdeMs), aFechaMysqlUtc(hastaMs), excluirSolicitudId]
  );
  return [...citas.map((c) => new Date(c.fecha_servicio).getTime()), ...propuestas.map((p) => new Date(p.fecha_propuesta).getTime())];
}

const hayChoque = (inicioMs, ocupadas) => ocupadas.some((o) => Math.abs(o - inicioMs) < DURACION_MS);

// Devuelve null si el proveedor puede atender a esa hora, o { codigo, mensaje } con el motivo.
async function motivoNoDisponible(db, proveedorId, inicioMs, excluirSolicitudId = 0) {
  const franjas = await leerDisponibilidad(db, proveedorId);
  if (franjas.length > 0) {
    const dia = diaSemanaLocal(inicioMs);
    const inicioMin = minutosLocal(inicioMs);
    const dentro = franjas.some(
      (f) => f.dia_semana === dia && inicioMin >= textoAMinutos(f.hora_inicio) && inicioMin + DURACION_MIN <= textoAMinutos(f.hora_fin)
    );
    if (!dentro) {
      return { codigo: 'fuera_de_horario', mensaje: 'El profesional no atiende en ese horario. Elige uno de los horarios disponibles.' };
    }
  }
  const ocupadas = await ocupaciones(db, proveedorId, inicioMs - DURACION_MS, inicioMs + DURACION_MS, excluirSolicitudId);
  if (hayChoque(inicioMs, ocupadas)) {
    return { codigo: 'ocupado', mensaje: 'Ese horario ya no está disponible. Elige otro.' };
  }
  return null;
}

// Ejecuta `fn(conexion)` dentro de una transacción que bloquea al proveedor: dos reservas para el mismo proveedor
// se atienden una detrás de otra, así la segunda ya ve la hora ocupada por la primera. Si `fn` lanza un error,
// se deshace todo.
async function conReservaDeProveedor(proveedorId, fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [proveedorId]);
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

// Agenda de un proveedor para mostrar al cliente: por día, las horas con su estado (libre, ocupado o pasado).
// No revela datos de otras citas, solo si la hora está libre.
async function construirAgenda(db, proveedorId, desdeFecha, dias, { excluirSolicitudId = 0, ahoraMs = Date.now() } = {}) {
  const franjas = await leerDisponibilidad(db, proveedorId);
  const horarioConfigurado = franjas.length > 0;
  const semanal = horarioConfigurado
    ? franjas
    : [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dia_semana: d, hora_inicio: HORARIO_POR_DEFECTO.inicio, hora_fin: HORARIO_POR_DEFECTO.fin }));

  const inicioRango = desdeLocal(desdeFecha, 0);
  const finRango = inicioRango + dias * 24 * 60 * 60 * 1000;
  const ocupadas = await ocupaciones(db, proveedorId, inicioRango - DURACION_MS, finRango + DURACION_MS, excluirSolicitudId);

  // Hora actual de la cita que se está reprogramando, para marcarla como "actual".
  let actualMs = null;
  if (excluirSolicitudId) {
    const [filas] = await db.execute('SELECT fecha_servicio FROM solicitudes WHERE id = ? AND proveedor_id = ?', [excluirSolicitudId, proveedorId]);
    if (filas.length > 0 && filas[0].fecha_servicio) actualMs = new Date(filas[0].fecha_servicio).getTime();
  }

  const resultado = [];
  for (let i = 0; i < dias; i += 1) {
    const fecha = fechaLocal(inicioRango + i * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000);
    const dia = diaSemanaDeFecha(fecha);
    const horas = [];
    for (const f of semanal.filter((x) => x.dia_semana === dia)) {
      const fin = textoAMinutos(f.hora_fin);
      for (let m = textoAMinutos(f.hora_inicio); m + DURACION_MIN <= fin; m += DURACION_MIN) {
        const inicioMs = desdeLocal(fecha, m);
        let estado = 'libre';
        if (inicioMs < ahoraMs + ANTICIPACION_MIN * 60 * 1000) estado = 'pasado';
        else if (hayChoque(inicioMs, ocupadas)) estado = 'ocupado';
        horas.push({ inicio: new Date(inicioMs).toISOString(), hora: minutosATexto(m), estado, actual: actualMs === inicioMs });
      }
    }
    resultado.push({ fecha, dia_semana: dia, horas });
  }
  return { proveedor_id: proveedorId, zona: 'America/Bogota', duracion_minutos: DURACION_MIN, horario_configurado: horarioConfigurado, dias: resultado };
}

module.exports = {
  DURACION_MIN,
  parsearFecha,
  leerDisponibilidad,
  ocupaciones,
  hayChoque,
  motivoNoDisponible,
  conReservaDeProveedor,
  construirAgenda,
  fechaLocal,
  textoAMinutos,
  aFechaMysqlUtc,
};
