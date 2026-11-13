// Código de verificación de correo: 6 caracteres alfanuméricos SOLO en MAYÚSCULAS.
//  - Alfabeto de 31 caracteres sin los confusos (0/O, 1/I/L): unas 887 millones de combinaciones.
//  - Se genera con crypto.randomInt (aleatorio criptográfico), nunca con Math.random.
//  - En la base solo se guarda un HMAC (con una clave del servidor): robar la tabla no permite sacar los códigos.
//  - Lo que escribe la persona se normaliza aquí, en el backend: minúsculas, espacios y guiones se aceptan.
const crypto = require('crypto');

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LONGITUD = 6;
const FORMATO = new RegExp(`^[${ALFABETO}]{${LONGITUD}}$`);

function generarCodigo() {
  let codigo = '';
  for (let i = 0; i < LONGITUD; i += 1) codigo += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return codigo;
}

// "ab3 k-9x" -> "AB3K9X". Devuelve null si no tiene la forma de un código (así ni se consulta la base).
function normalizarCodigo(entrada) {
  if (typeof entrada !== 'string') return null;
  const limpio = entrada.replace(/[\s-]/g, '').toUpperCase();
  return FORMATO.test(limpio) ? limpio : null;
}

// HMAC-SHA256 del código ligado al usuario: el mismo código en dos cuentas da hashes distintos.
function hashDeCodigo(codigo, usuarioId) {
  const clave = process.env.JWT_SECRET || 'urbify-sin-secreto-solo-desarrollo';
  return crypto.createHmac('sha256', clave).update(`verificacion-correo:${usuarioId}:${codigo}`).digest('hex');
}

// Comparación en tiempo constante (no revela cuántos caracteres coinciden por lo que tarda).
function codigoCoincide(codigo, usuarioId, hashGuardado) {
  const a = Buffer.from(hashDeCodigo(codigo, usuarioId), 'hex');
  const b = Buffer.from(String(hashGuardado || ''), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { ALFABETO, LONGITUD, generarCodigo, normalizarCodigo, hashDeCodigo, codigoCoincide };
