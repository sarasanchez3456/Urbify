import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';
import {
  getToken,
  setToken,
  clearSession,
  endSession,
  tokenExpiresAt,
  isTokenExpired,
  onSessionEnded,
  onTokenChangedInOtherTab,
} from '../api/session';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Los datos del usuario solo viven en memoria; en el navegador únicamente se guarda el token.
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Pide el perfil con el token actual. Sin token o con token vencido no hay sesión.
  const restaurarSesion = useCallback(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      if (token) clearSession();
      setUsuario(null);
      setCargando(false);
      return;
    }
    api.get('/auth/perfil')
      .then((res) => setUsuario(res.data))
      .catch((err) => {
        // 401 ya lo gestiona el interceptor (limpia el token y avisa). Un 404 significa que
        // el usuario ya no existe. Otros errores (red caída) conservan la sesión.
        if (err.response?.status === 404) {
          endSession();
        }
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    restaurarSesion();
  }, [restaurarSesion]);

  // La sesión terminó en esta pestaña (401 o token vencido): olvidar al usuario.
  useEffect(() => onSessionEnded(() => setUsuario(null)), []);

  // Sincronización entre pestañas: login o logout hechos en otra pestaña se reflejan aquí.
  useEffect(
    () =>
      onTokenChangedInOtherTab((token) => {
        if (!token) {
          setUsuario(null);
        } else {
          restaurarSesion();
        }
      }),
    [restaurarSesion]
  );

  // Cierra la sesión local cuando el token vence, aunque la pestaña esté abierta y en reposo.
  useEffect(() => {
    if (!usuario) return undefined;
    const token = getToken();
    const expiraEn = token ? tokenExpiresAt(token) : null;
    if (expiraEn === null) return undefined;

    const comprobar = () => {
      const actual = getToken();
      if (!actual || isTokenExpired(actual)) endSession();
    };
    // setTimeout admite hasta ~24.8 días; el JWT dura 7, pero se acota por seguridad.
    const timer = setTimeout(comprobar, Math.min(Math.max(expiraEn - Date.now(), 0), 2 ** 31 - 1));
    // Los timers se retrasan con la pestaña en segundo plano: se comprueba al volver.
    document.addEventListener('visibilitychange', comprobar);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', comprobar);
    };
  }, [usuario]);

  const iniciarSesion = useCallback((token, user) => {
    setToken(token);
    setUsuario(user);
    return user;
  }, []);

  const login = useCallback(async (correo, contrasena) => {
    const res = await api.post('/auth/login', { correo, contrasena });
    return iniciarSesion(res.data.token, res.data.usuario);
  }, [iniciarSesion]);

  // El registro ya NO inicia sesión: crea la cuenta sin verificar y envía un código al correo. Devuelve { correo, ... }.
  const registrar = useCallback(async (datos) => {
    const res = await api.post('/auth/registro', datos);
    return res.data;
  }, []);

  // Con el código correcto el servidor activa la cuenta y entrega la sesión.
  const verificarCorreo = useCallback(async (correo, codigo) => {
    const res = await api.post('/auth/verificar-correo', { correo, codigo });
    return iniciarSesion(res.data.token, res.data.usuario);
  }, [iniciarSesion]);

  // Logout local inmediato + revocación del token en el servidor (POST /auth/logout).
  // Si el servidor no responde, la sesión local igual queda cerrada.
  const logout = useCallback(() => {
    const token = getToken();
    clearSession();
    setUsuario(null);
    if (token) {
      // Sin cuerpo (undefined, no null): axios no envía Content-Type y no hay JSON que validar.
      api.post('/auth/logout', undefined, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
  }, []);

  // Actualiza en memoria datos del usuario ya cargado (por ejemplo, el nombre del encabezado tras editar el perfil).
  const actualizarUsuario = useCallback((cambios) => setUsuario((u) => (u ? { ...u, ...cambios } : u)), []);

  const value = useMemo(
    () => ({ usuario, cargando, login, registrar, verificarCorreo, logout, actualizarUsuario }),
    [usuario, cargando, login, registrar, verificarCorreo, logout, actualizarUsuario]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
