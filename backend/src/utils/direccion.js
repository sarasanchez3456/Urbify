// Validación común de direcciones (registro, perfil y solicitudes). La dirección es opcional: vacía o ausente es válida.
// Si viene, debe tener entre 5 y 255 caracteres (sin contar espacios de los lados) y solo letras, números y # - . , / ( ) '
const PERMITIDOS = /^[\p{L}\p{N}\s#\-.,°ºª/()']+$/u;
const MENSAJE = "La dirección debe tener entre 5 y 255 caracteres y solo letras, números y # - . , / ( ) '";

// Devuelve el mensaje de error, o null si la dirección es válida.
function errorDeDireccion(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (texto.length < 5 || texto.length > 255 || !PERMITIDOS.test(texto)) return MENSAJE;
  return null;
}

module.exports = { errorDeDireccion };
