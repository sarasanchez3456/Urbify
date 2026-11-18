// Código de inicio del servicio (issue #57). Como el PIN de un viaje: el cliente ve un código de 6 dígitos en su
// solicitud aceptada y se lo dice al proveedor cuando llega; el proveedor lo escribe para pasar a `en_proceso`.
//
// El código NO se guarda: se deriva con HMAC-SHA256 (clave del servidor + id de la solicitud + una sal aleatoria
// propia de esa solicitud). Así no hay una columna con códigos que se pueda filtrar, el cliente puede volver a verlo
// las veces que quiera, y pedir uno nuevo es cambiar la sal. Sin la clave del servidor, la sal sola no sirve de nada.
const crypto = require('crypto');
const { jwtSecret } = require('../config/env');

const DIGITOS = 6;
// Fallos permitidos al proveedor antes de bloquear el código (el cliente puede generar uno nuevo).
const MAX_INTENTOS = 5;

// Clave propia de esta función, derivada del secreto del servidor: un código nunca coincide con nada del JWT.
const clave = crypto.createHmac('sha256', jwtSecret || 'urbify-sin-secreto').update('urbify:codigo-inicio:v1').digest();

const nuevaSal = () => crypto.randomBytes(16).toString('hex');

function derivarCodigo(solicitudId, sal) {
  const mac = crypto.createHmac('sha256', clave).update(`${Number(solicitudId)}:${sal}`).digest();
  // 48 bits del HMAC reducidos a 6 dígitos: el sesgo del módulo es despreciable (2^48 >> 10^6).
  return String(mac.readUIntBE(0, 6) % 10 ** DIGITOS).padStart(DIGITOS, '0');
}

// Compara en tiempo constante (no revela cuántos dígitos acertó el proveedor). Solo acepta exactamente 6 dígitos.
function codigoCorrecto(solicitudId, sal, codigo) {
  if (!sal || typeof codigo !== 'string' || !/^\d{6}$/.test(codigo)) return false;
  return crypto.timingSafeEqual(Buffer.from(derivarCodigo(solicitudId, sal)), Buffer.from(codigo));
}

// El proveedor puede escribirlo con espacios o guiones ("123 456"): se dejan solo los dígitos.
const normalizarCodigo = (valor) => (typeof valor === 'string' || typeof valor === 'number' ? String(valor).replace(/[\s-]/g, '') : '');

// Columnas internas: nunca salen en las respuestas de la API.
function sinDatosDeCodigo(solicitud) {
  const { codigo_inicio_sal, codigo_inicio_intentos, ...resto } = solicitud;
  return resto;
}

module.exports = { DIGITOS, MAX_INTENTOS, nuevaSal, derivarCodigo, codigoCorrecto, normalizarCodigo, sinDatosDeCodigo };
