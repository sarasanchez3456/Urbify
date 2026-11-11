// Motivos rápidos que el cliente puede marcar al calificar un servicio. Con 4 o 5 estrellas se eligen motivos
// positivos; con 3 o menos, negativos. Se guardan como códigos (nunca texto libre) para poder contarlos después.
const POSITIVOS = ['puntual', 'trabajo_limpio', 'buen_precio', 'buena_comunicacion', 'lo_recomiendo'];
const NEGATIVOS = ['llego_tarde', 'no_termino', 'poca_comunicacion', 'precio_distinto', 'dejo_desorden'];
const MAX_MOTIVOS = 5;

// Devuelve un mensaje de error, o null si los motivos son válidos para esa puntuación.
function validarMotivos(motivos, puntuacion) {
  if (!Array.isArray(motivos)) return 'motivos debe ser una lista';
  if (motivos.length > MAX_MOTIVOS) return `Puedes elegir hasta ${MAX_MOTIVOS} motivos`;
  if (motivos.some((m) => typeof m !== 'string')) return 'Cada motivo debe ser texto';
  if (new Set(motivos).size !== motivos.length) return 'No repitas motivos';

  const desconocido = motivos.find((m) => !POSITIVOS.includes(m) && !NEGATIVOS.includes(m));
  if (desconocido !== undefined) return `Motivo no válido: ${desconocido}`;

  const positiva = puntuacion >= 4;
  const permitidos = positiva ? POSITIVOS : NEGATIVOS;
  if (motivos.some((m) => !permitidos.includes(m))) {
    return positiva
      ? 'Con 4 o 5 estrellas solo se pueden elegir motivos positivos'
      : 'Con 3 estrellas o menos solo se pueden elegir motivos negativos';
  }
  return null;
}

// Los motivos se guardan en una sola columna separados por comas; al responder vuelven a ser una lista.
const motivosAColumna = (motivos) => (Array.isArray(motivos) && motivos.length > 0 ? motivos.join(',') : null);
const motivosDeColumna = (texto) => (texto ? String(texto).split(',').filter(Boolean) : []);

module.exports = { POSITIVOS, NEGATIVOS, validarMotivos, motivosAColumna, motivosDeColumna };
