import axios from 'axios';
import { getToken, isTokenExpired, endSession } from './session';

// En desarrollo usa el proxy de Vite (/api → localhost:4000).
// En producción (GitHub Pages) usa la variable VITE_API_URL del archivo .env.production.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Un 401 en estas rutas significa "credenciales incorrectas", no "sesión caducada":
// no debe cerrar la sesión ni redirigir.
const RUTAS_DE_CREDENCIALES = ['/auth/login', '/auth/registro'];
const esRutaDeCredenciales = (url = '') => RUTAS_DE_CREDENCIALES.some((r) => url.endsWith(r));

let onUnauthorized = null;

export function setOnUnauthorized(callback) {
  onUnauthorized = callback;
}

function terminarSesion() {
  endSession();
  if (onUnauthorized) {
    onUnauthorized();
  }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (!token || esRutaDeCredenciales(config.url)) {
    return config;
  }
  if (isTokenExpired(token)) {
    // Token vencido: se limpia la sesión y la petición sale sin credenciales (las rutas
    // públicas siguen funcionando). No se redirige: RutaProtegida lo hace si hace falta.
    endSession();
    return config;
  }
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const enviado = error.config?.headers?.Authorization;
    if (
      error.response?.status === 401 &&
      enviado &&
      !esRutaDeCredenciales(error.config?.url) &&
      // Solo si el token rechazado sigue siendo el actual: una respuesta tardía de una
      // sesión anterior no debe cerrar un inicio de sesión nuevo (ni provocar bucles).
      enviado === `Bearer ${getToken()}`
    ) {
      terminarSesion();
    }
    return Promise.reject(error);
  }
);

export default api;
