// console.error que ignora los errores esperados: un 401 (la sesión terminó o se revocó; AuthContext ya
// limpia la sesión y redirige) y las peticiones canceladas. Así la consola no se llena de ruido al cerrar sesión.
export function logError(...args) {
  const err = args.find((a) => a && typeof a === 'object' && ('response' in a || 'name' in a));
  if (err && (err.response?.status === 401 || err.name === 'CanceledError' || err.code === 'ERR_CANCELED')) return;
  console.error(...args);
}
