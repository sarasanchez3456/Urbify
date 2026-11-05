// Almacenamiento de la sesión del navegador. Solo se guarda el JWT; los datos del usuario
// viven únicamente en memoria (AuthContext) y se piden al backend al restaurar la sesión.
// Estrategia y justificación: docs/AUTENTICACION_WEB.md

const TOKEN_KEY = 'token';
// Clave que versiones anteriores guardaban con datos del usuario; se elimina siempre.
const LEGACY_USER_KEY = 'usuario';

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Acceso bloqueado (modo privado estricto, cookies deshabilitadas, etc.)
    return null;
  }
}

export function getToken() {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function setToken(token) {
  const s = storage();
  if (!s) return;
  s.setItem(TOKEN_KEY, token);
  s.removeItem(LEGACY_USER_KEY);
}

export function clearSession() {
  const s = storage();
  if (!s) return;
  s.removeItem(TOKEN_KEY);
  s.removeItem(LEGACY_USER_KEY);
}

// Fecha de expiración (ms desde epoch) leída del claim `exp` del JWT, o null si no se puede leer.
// Solo sirve para evitar peticiones con un token ya vencido: la validez real la decide el servidor.
export function tokenExpiresAt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token, now = Date.now()) {
  const expiresAt = tokenExpiresAt(token);
  return expiresAt !== null && expiresAt <= now;
}

// Aviso interno de "la sesión terminó en ESTA pestaña" (401, token vencido). Permite que
// AuthContext olvide al usuario en memoria: sin esto, la UI seguiría mostrando datos
// protegidos aunque el token ya se haya borrado.
const listeners = new Set();

export function endSession() {
  clearSession();
  listeners.forEach((cb) => cb());
}

export function onSessionEnded(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Avisa cuando OTRA pestaña cambia el token (login, logout o expiración).
// Devuelve la función para cancelar la suscripción.
export function onTokenChangedInOtherTab(callback) {
  const handler = (event) => {
    // key === null: otra pestaña ejecutó localStorage.clear()
    if (event.key === TOKEN_KEY || event.key === null) callback(getToken());
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
