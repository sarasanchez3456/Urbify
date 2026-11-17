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

// Una cuenta puede actuar como cliente o como proveedor (modo activo). Para que el resto de la app siga leyendo
// `usuario.rol`, aquí `rol` pasa a ser el modo activo; el rol "admin" queda aparte. `esProveedor` indica si la
// cuenta puede cambiar a modo proveedor. El servidor decide los permisos: esto solo ajusta lo que se muestra.
export function normalizarUsuario(u) {
  if (!u) return u;
  if (u.rol === 'admin') return { ...u, esProveedor: false };
  const esProveedor = Boolean(u.es_proveedor ?? u.puede_ser_proveedor ?? u.rol === 'proveedor');
  const modo = u.modo_activo === 'cliente' || u.modo_activo === 'proveedor' ? u.modo_activo : u.rol;
  return { ...u, rol: modo, esProveedor };
}

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
      .then((res) => setUsuario(normalizarUsuario(res.data)))
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
    const normalizado = normalizarUsuario(user);
    setUsuario(normalizado);
    return normalizado;
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

  // Vuelve a pedir el perfil con el token actual (después de cambiar de modo o de volverse proveedor).
  const recargarPerfil = useCallback(async () => {
    const res = await api.get('/auth/perfil');
    const normalizado = normalizarUsuario(res.data);
    setUsuario(normalizado);
    return normalizado;
  }, []);

  // POST /auth/cambiar-modo { modo }: el servidor devuelve el token nuevo de ese modo y el anterior deja de valer.
  const cambiarModo = useCallback(async (modo) => {
    const res = await api.post('/auth/cambiar-modo', { modo });
    if (res.data?.token) setToken(res.data.token);
    return recargarPerfil();
  }, [recargarPerfil]);

  // POST /auth/ser-proveedor { oficio, categoria_id }: habilita la cuenta como proveedor sin verificar el correo otra vez.
  const serProveedor = useCallback(async ({ oficio, categoriaId }) => {
    const res = await api.post('/auth/ser-proveedor', { oficio, categoria_id: Number(categoriaId) });
    if (res.data?.token) setToken(res.data.token);
    return recargarPerfil();
  }, [recargarPerfil]);

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
    () => ({ usuario, cargando, login, registrar, verificarCorreo, logout, actualizarUsuario, cambiarModo, serProveedor }),
    [usuario, cargando, login, registrar, verificarCorreo, logout, actualizarUsuario, cambiarModo, serProveedor]
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
