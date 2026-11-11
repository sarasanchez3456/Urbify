// Avisos en tiempo real (Server-Sent Events): cada usuario con la app abierta mantiene una conexión; cuando se crea
// una notificación para él se le envía un evento y su campana se actualiza al instante, sin esperar la consulta periódica.
// Las conexiones viven en memoria de este proceso. Con varias instancias del backend cada usuario recibiría solo los
// avisos de la instancia a la que está conectado; la consulta periódica de la web sigue funcionando como respaldo.
const conexiones = new Map(); // usuarioId -> Set de respuestas

function suscribir(usuarioId, res) {
  if (!conexiones.has(usuarioId)) conexiones.set(usuarioId, new Set());
  conexiones.get(usuarioId).add(res);
  res.on('close', () => {
    const set = conexiones.get(usuarioId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) conexiones.delete(usuarioId);
  });
}

function avisar(usuarioId, datos = {}) {
  const set = conexiones.get(Number(usuarioId));
  if (!set) return;
  const mensaje = `event: notificacion\ndata: ${JSON.stringify(datos)}\n\n`;
  for (const res of set) {
    try { res.write(mensaje); } catch { /* la conexión ya se cerró */ }
  }
}

// Detecta el usuario destinatario en un INSERT INTO notificaciones (columnas y valores), sin importar el orden.
// Devuelve la posición del parámetro `usuario_id` dentro de `params`, o -1.
function posicionUsuario(sql) {
  const m = /^\s*INSERT\s+INTO\s+notificaciones\s*\(([^)]*)\)\s*VALUES\s*\((.*)\)\s*$/is.exec(sql);
  if (!m) return -1;
  const columnas = m[1].split(',').map((c) => c.trim());
  const valores = m[2].split(',').map((v) => v.trim());
  let indice = -1;
  let parametros = 0;
  columnas.forEach((col, i) => {
    if (valores[i] === '?') {
      if (col === 'usuario_id') indice = parametros;
      parametros += 1;
    }
  });
  return indice;
}

module.exports = { suscribir, avisar, posicionUsuario };
