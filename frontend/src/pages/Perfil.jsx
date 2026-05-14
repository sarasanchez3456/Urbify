import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './Auth.css';
import './Perfil.css';

export default function Perfil() {
  const { usuario } = useAuth();
  const [form, setForm] = useState({
    nombre: '', apellido: '', telefono: '', direccion: '',
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    api.get('/auth/perfil')
      .then((res) => {
        const u = res.data;
        setForm({ nombre: u.nombre, apellido: u.apellido, telefono: u.telefono || '', direccion: u.direccion || '' });
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    try {
      await api.put('/auth/perfil', form);
      setMensaje('Perfil actualizado exitosamente');
    } catch (err) {
      setMensaje('Error al actualizar perfil');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="loading container">Cargando...</div>;

  return (
    <div className="auth-page container">
      <div className="auth-card card">
        <h1>Mi Perfil</h1>
        <p className="perfil-rol">Rol: {usuario?.rol === 'proveedor' ? 'Proveedor' : 'Cliente'}</p>
        {mensaje && (
          <div className={`alert ${mensaje.includes('Error') ? 'alert-error' : 'alert-success'}`}>
            {mensaje}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
