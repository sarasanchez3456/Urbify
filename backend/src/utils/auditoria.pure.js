// Validación del motivo de las acciones de administración (sin dependencias, para poder probarla sola).
// El motivo es obligatorio: entre 10 y 300 caracteres. Devuelve el texto limpio o null.
function motivoValido(valor) {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  return texto.length >= 10 && texto.length <= 300 ? texto : null;
}

module.exports = { motivoValido };