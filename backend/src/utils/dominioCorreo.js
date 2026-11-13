// Comprueba que el dominio de un correo existe y puede recibir mensajes ("gmial.com" no). No dice si la CUENTA existe,
// solo el dominio, así que no revela nada de los usuarios. Si el DNS no responde (red caída, tiempo agotado) se deja
// pasar: el código que llega al correo es la verdadera prueba, esto solo evita errores de tipeo.
const dns = require('dns').promises;

const SIN_DOMINIO = new Set(['ENOTFOUND', 'ENODATA', 'NXDOMAIN']);

// `resolver` se puede reemplazar en las pruebas.
async function dominioPuedeRecibirCorreo(correo, resolver = dns, esperaMs = 3000) {
  const dominio = String(correo).split('@').pop().trim().toLowerCase();
  if (!dominio.includes('.')) return false;

  const consultar = async () => {
    try {
      const mx = await resolver.resolveMx(dominio);
      if (mx.length > 0) return true;
    } catch (err) {
      if (!SIN_DOMINIO.has(err.code)) throw err;
    }
    // Sin registros MX, un dominio con dirección propia también puede recibir correo.
    try {
      const a = await resolver.resolve4(dominio);
      return a.length > 0;
    } catch (err) {
      if (SIN_DOMINIO.has(err.code)) return false;
      throw err;
    }
  };

  let temporizador;
  try {
    return await Promise.race([
      consultar(),
      new Promise((_, rechazar) => { temporizador = setTimeout(() => rechazar(new Error('tiempo agotado')), esperaMs); }),
    ]);
  } catch {
    return true;
  } finally {
    clearTimeout(temporizador);
  }
}

module.exports = { dominioPuedeRecibirCorreo };
