// Avisos en tiempo real (Server-Sent Events): cada usuario con la app abierta mantiene una conexión; cuando se crea
// una notificación para él se le envía un evento y su campana se actualiza al instante, sin esperar la consulta periódica.
// Una cuenta con los dos modos solo recibe los avisos del modo de la sesión de cada conexión: las notificaciones del
// modo contrario no llegan (las que no tienen modo llegan a todas). El administrador no tiene modo y recibe todas.
// Las conexiones viven en memoria de este proceso. Con varias instancias del backend cada usuario recibiría solo los
// avisos de la instancia a la que está conectado; la consulta periódica de la web sigue funcionando como respaldo.
const conexiones = new Map(); // usuarioId -> Set de { res, modo }

function suscribir(usuarioId, res, modo = null) {
  const conexion = { res, modo: modo || null };
  if (!conexiones.has(usuarioId)) conexiones.set(usuarioId, new Set());
  conexiones.get(usuarioId).add(conexion);
  res.on('close', () => {
    const set = conexiones.get(usuarioId);
    if (!set) return;
    set.delete(conexion);
    if (set.size === 0) conexiones.delete(usuarioId);
  });
}

// ¿Esta conexión debe recibir una notificación del modo `modoNotificacion`?
const aplicaAlModo = (modoConexion, modoNotificacion) => !modoConexion || !modoNotificacion || modoConexion === modoNotificacion;

function avisar(usuarioId, datos = {}) {
  const set = conexiones.get(Number(usuarioId));
  if (!set) return;
  const mensaje = `event: notificacion\ndata: ${JSON.stringify(datos)}\n\n`;
  for (const { res, modo } of set) {
    if (!aplicaAlModo(modo, datos.modo)) continue;
    try { res.write(mensaje); } catch { /* la conexión ya se cerró */ }
  }
}

// Detecta en un INSERT INTO notificaciones (columnas y valores), sin importar el orden, la posición dentro de `params`
// del destinatario (`usuario_id`) y del `modo`. Cada una vale -1 si esa columna no viene como parámetro `?`.
function posicionesNotificacion(sql) {
  const m = /^\s*INSERT\s+INTO\s+notificaciones\s*\(([^)]*)\)\s*VALUES\s*\((.*)\)\s*$/is.exec(sql);
  if (!m) return { usuario: -1, modo: -1 };
  const columnas = m[1].split(',').map((c) => c.trim());
  const valores = m[2].split(',').map((v) => v.trim());
  const posiciones = { usuario: -1, modo: -1 };
  let parametros = 0;
  columnas.forEach((col, i) => {
    if (valores[i] === '?') {
      if (col === 'usuario_id') posiciones.usuario = parametros;
      if (col === 'modo') posiciones.modo = parametros;
      parametros += 1;
    }
  });
  return posiciones;
}

// Se conserva por compatibilidad: solo la posición del destinatario.
const posicionUsuario = (sql) => posicionesNotificacion(sql).usuario;

module.exports = { suscribir, avisar, posicionUsuario, posicionesNotificacion, aplicaAlModo };
