import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const user = await login(correo, contrasena);
      navigate(user.rol === 'proveedor' ? '/mis-servicios' : '/buscar');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-page container">
      <div className="auth-card card">
        <h1>Iniciar Sesión</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={cargando}>
            {cargando ? 'Entrando...' : 'Iniciar Sesión'}
          </button>
        </form>
        <p className="auth-link">
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
