import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    contrasena: '',
    telefono: '',
    rol: 'cliente',
    direccion: '',
  });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { registrar } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const user = await registrar(form);
      navigate(user.rol === 'proveedor' ? '/mis-servicios' : '/buscar');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-page container">
      <div className="auth-card card">
        <h1>Crear Cuenta</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input name="apellido" value={form.apellido} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input type="email" name="correo" value={form.correo} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" name="contrasena" value={form.contrasena} onChange={handleChange} required minLength={6} />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input name="direccion" value={form.direccion} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Tipo de cuenta</label>
            <select name="rol" value={form.rol} onChange={handleChange}>
              <option value="cliente">Cliente - Quiero contratar servicios</option>
              <option value="proveedor">Proveedor - Quiero ofrecer servicios</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={cargando}>
            {cargando ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>
        <p className="auth-link">
          ¿Ya tienes cuenta? <Link to="/login">Inicia Sesión</Link>
        </p>
      </div>
    </div>
  );
}
