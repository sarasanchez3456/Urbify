// Trabajo que continúa DESPUÉS de haber respondido (enviar un correo, por ejemplo), para que la respuesta no tarde ni
// revele nada por su tiempo.
//
// En un servidor normal basta con dejar la promesa corriendo. En un entorno sin servidor (Vercel) la función puede
// congelarse apenas se envía la respuesta y el correo nunca saldría: allí se registra con `waitUntil`, que mantiene
// la función viva hasta que la promesa termine. Los errores se registran en el log y nunca rompen la respuesta.
function mantenerVivo(promesa, contexto = 'Tarea en segundo plano') {
  const segura = Promise.resolve(promesa).catch((err) => console.error(`${contexto}:`, err?.message || err));
  if (process.env.VERCEL) {
    try {
      require('@vercel/functions').waitUntil(segura);
    } catch (err) {
      console.error('No se pudo registrar la tarea con waitUntil:', err.message);
    }
  }
  return segura;
}

module.exports = { mantenerVivo };
