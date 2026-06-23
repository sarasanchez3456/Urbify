import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCargando(false);
      return;
    }
    api.get('/auth/perfil')
      .then((res) => {
        setUsuario(res.data);
        localStorage.setItem('usuario', JSON.stringify(res.data));
      })
      .catch((err) => {
        if (err.response?.status === 401 || err.response?.status === 404) {
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          setUsuario(null);
        }
      })
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(async (correo, contrasena) => {
    const res = await api.post('/auth/login', { correo, contrasena });
    const { token, usuario: user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(user));
    setUsuario(user);
    return user;
  }, []);

  const registrar = useCallback(async (datos) => {
    const res = await api.post('/auth/registro', datos);
    const { token, usuario: user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(user));
    setUsuario(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  const value = useMemo(() => ({ usuario, cargando, login, registrar, logout }), [usuario, cargando, login, registrar, logout]);

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
