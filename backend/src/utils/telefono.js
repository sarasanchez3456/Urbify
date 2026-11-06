// Teléfonos: solo dígitos, con un "+" inicial opcional (p. ej. +57 300 123 4567). Se aceptan
// espacios al escribirlos, pero se guardan sin ellos. De 7 dígitos (fijo) a 15 (máximo E.164).
const TELEFONO_REGEX = /^\+?\d{7,15}$/;

// Devuelve el teléfono normalizado, o null si no es válido.
function normalizarTelefono(valor) {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null;
  const limpio = String(valor).replace(/\s+/g, '');
  return TELEFONO_REGEX.test(limpio) ? limpio : null;
}

const MENSAJE_TELEFONO = 'El teléfono solo puede contener números (7 a 15 dígitos, con + inicial opcional)';

module.exports = { normalizarTelefono, MENSAJE_TELEFONO };
