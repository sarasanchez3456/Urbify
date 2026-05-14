import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('usuario');
    if (stored) {
      setUsuario(JSON.parse(stored));
    }
    setCargando(false);
  }, []);

  const login = async (correo, contrasena) => {
    const res = await api.post('/auth/login', { correo, contrasena });
    const { token, usuario: user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(user));
    setUsuario(user);
    return user;
  };

  const registrar = async (datos) => {
    const res = await api.post('/auth/registro', datos);
    const { token, usuario: user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(user));
    setUsuario(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
