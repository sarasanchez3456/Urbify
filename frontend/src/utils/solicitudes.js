// Funciones de apoyo para las pantallas que muestran solicitudes (estado, progreso, dinero y fechas).
// Las fechas llegan del backend en UTC (ISO 8601 con "Z"); Urbify opera en Colombia (UTC-5, sin horario
// de verano), así que todas se muestran en la hora de Colombia, igual que los correos del servidor.

const ZONA = 'America/Bogota';

// Algunos navegadores abrevian con punto ("nov.", "mié."). Se lo quita a las abreviaturas de tres o más
// letras y deja intacto el "a. m." / "p. m.".
const sinPuntoDeAbreviatura = (texto) => texto.replace(/(\p{L}{3,})\./gu, '$1');

export const ETIQUETAS_ESTADO = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  en_proceso: 'En proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

// Pasos del seguimiento de una solicitud (una cancelada no sigue este camino).
export const PASOS = ['Enviada', 'Aceptada', 'En proceso', 'Completada'];

export const ESTADOS_EN_CURSO = ['pendiente', 'aceptada', 'en_proceso'];

// Posición (0 a 3) del paso en el que está la solicitud: pendiente = "Enviada" (esperando respuesta),
// aceptada = "Aceptada", en_proceso = "En proceso" y completada = "Completada". Los pasos anteriores están
// cumplidos; al completarse, todos lo están. Una cancelada no sigue este camino.
const INDICE_PASO = { pendiente: 0, aceptada: 1, en_proceso: 2, completada: 3 };

export function indicePaso(estado) {
  return INDICE_PASO[estado] ?? -1;
}

// Estado visual de cada paso: 'hecho', 'actual' o 'pendiente'.
export function estadoDelPaso(estado, i) {
  const actual = indicePaso(estado);
  if (actual < 0) return 'pendiente';
  if (estado === 'completada') return 'hecho';
  if (i < actual) return 'hecho';
  return i === actual ? 'actual' : 'pendiente';
}

// Motivos rápidos al calificar (los mismos códigos que valida el backend en utils/motivosCalificacion.js).
// Con 4 o 5 estrellas se eligen los positivos; con 3 o menos, los negativos.
export const MOTIVOS_POSITIVOS = [
  ['puntual', 'Puntual'],
  ['trabajo_limpio', 'Trabajo limpio'],
  ['buen_precio', 'Buen precio'],
  ['buena_comunicacion', 'Buena comunicación'],
  ['lo_recomiendo', 'Lo recomiendo'],
];
export const MOTIVOS_NEGATIVOS = [
  ['llego_tarde', 'Llegó tarde'],
  ['no_termino', 'No terminó el trabajo'],
  ['poca_comunicacion', 'Poca comunicación'],
  ['precio_distinto', 'Precio distinto al acordado'],
  ['dejo_desorden', 'Dejó desorden'],
];
export const ETIQUETA_MOTIVO = Object.fromEntries([...MOTIVOS_POSITIVOS, ...MOTIVOS_NEGATIVOS]);

export const TIPO_TARIFA = { hora: 'por hora', fijo: 'tarifa fija' };
export const TIPO_TARIFA_LARGO = { hora: 'Tarifa por hora', fijo: 'Tarifa fija' };

export function formatearDinero(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '$0';
  return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

// Una solicitud completada que el cliente todavía no ha calificado.
export function estaSinCalificar(solicitud) {
  return solicitud.estado === 'completada' && (solicitud.calificacion_puntuacion === null || solicitud.calificacion_puntuacion === undefined);
}

export function iniciales(nombre, apellido) {
  return `${(nombre || '').trim().charAt(0)}${(apellido || '').trim().charAt(0)}`.toUpperCase() || '?';
}

function fechaValida(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

// "miércoles, 11 de noviembre, 6:11 a. m."
export function fechaServicioLarga(iso) {
  const d = fechaValida(iso);
  if (!d) return '';
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: ZONA,
  }).format(d);
}

// "9 nov, 6:09 a. m." (para las fechas del seguimiento)
export function fechaHoraCorta(iso) {
  const d = fechaValida(iso);
  if (!d) return '';
  return sinPuntoDeAbreviatura(new Intl.DateTimeFormat('es-CO', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: ZONA,
  }).format(d));
}

// "mié 11 nov, 6:11 a. m."
export function fechaServicioCorta(iso) {
  const d = fechaValida(iso);
  if (!d) return '';
  return sinPuntoDeAbreviatura(new Intl.DateTimeFormat('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: ZONA,
  }).format(d));
}

// "hoy", "ayer", "hace 3 días" o la fecha si pasó más de un mes.
export function fechaRelativa(iso) {
  const d = fechaValida(iso);
  if (!d) return '';
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias < 1) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  return sinPuntoDeAbreviatura(new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: ZONA }).format(d));
}

export function horaMensaje(iso) {
  const d = fechaValida(iso);
  if (!d) return '';
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: ZONA }).format(d);
}

// Etiqueta del día para separar los mensajes del chat: "Hoy", "Ayer" o "11 nov".
export function etiquetaDia(iso) {
  const d = fechaValida(iso);
  if (!d) return '';
  const clave = (x) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(x); // AAAA-MM-DD en hora de Colombia
  const hoy = clave(new Date());
  const ayer = clave(new Date(Date.now() - 86400000));
  const dia = clave(d);
  if (dia === hoy) return 'Hoy';
  if (dia === ayer) return 'Ayer';
  return sinPuntoDeAbreviatura(new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: ZONA }).format(d));
}

export function claveDia(iso) {
  const d = fechaValida(iso);
  return d ? new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(d) : '';
}
