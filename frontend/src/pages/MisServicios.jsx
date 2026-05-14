import { useState, useEffect } from 'react';
import api from '../api/axios';
import './Buscar.css';

export default function MisServicios() {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState({ categoria_id: '', titulo: '', descripcion: '', tarifa: '', tipo_tarifa: 'hora' });
  const [error, setError] = useState('');

  const cargarServicios = () => {
    api.get('/servicios/mios')
      .then((res) => setServicios(res.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarServicios();
    api.get('/categorias').then((res) => setCategorias(res.data)).catch(() => {});
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/servicios', { ...form, tarifa: parseFloat(form.tarifa) });
      setMostrarForm(false);
      setForm({ categoria_id: '', titulo: '', descripcion: '', tarifa: '', tipo_tarifa: 'hora' });
      cargarServicios();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear servicio');
    }
  };

  const toggleDisponible = async (servicio) => {
    try {
      await api.put(`/servicios/${servicio.id}`, { disponible: servicio.disponible ? 0 : 1 });
      cargarServicios();
    } catch (err) {
      console.error(err);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    try {
      await api.delete(`/servicios/${id}`);
      cargarServicios();
    } catch (err) {
      console.error(err);
    }
  };

  if (cargando) return <div className="loading container">Cargando...</div>;

  return (
    <div className="buscar-page container">
      <div className="page-header">
        <h1>Mis Servicios</h1>
        <p>Gestiona los servicios que ofreces como proveedor</p>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          {mostrarForm ? 'Cancelar' : 'Nuevo Servicio'}
        </button>
      </div>

      {mostrarForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Crear Nuevo Servicio</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCrear}>
            <div className="form-group">
              <label>Categoría</label>
              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} required>
                <option value="">Seleccionar categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Título del servicio</label>
              <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea rows="3" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Tarifa</label>
                <input type="number" step="0.01" min="0" value={form.tarifa} onChange={(e) => setForm({ ...form, tarifa: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Tipo de tarifa</label>
                <select value={form.tipo_tarifa} onChange={(e) => setForm({ ...form, tipo_tarifa: e.target.value })}>
                  <option value="hora">Por hora</option>
                  <option value="fijo">Precio fijo</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Crear Servicio</button>
          </form>
        </div>
      )}

      {servicios.length === 0 ? (
        <div className="sin-resultados">
          <h3>No tienes servicios publicados</h3>
          <p>Crea tu primer servicio para empezar a recibir solicitudes</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {servicios.map((s) => (
            <div key={s.id} className="card">
              <div className="servicio-header">
                <div>
                  <span className="detalle-categoria">{s.categoria_nombre}</span>
                  <h3 className="servicio-titulo" style={{ marginTop: '0.5rem' }}>{s.titulo}</h3>
                </div>
                <span className="servicio-precio">${parseFloat(s.tarifa).toFixed(2)}/{s.tipo_tarifa}</span>
              </div>
              <p className="servicio-descripcion">{s.descripcion?.substring(0, 100)}</p>
              <div className="servicio-footer">
                <button onClick={() => toggleDisponible(s)} className={`btn btn-sm ${s.disponible ? 'btn-secondary' : 'btn-primary'}`}>
                  {s.disponible ? 'Disponible' : 'Pausado'}
                </button>
                <button onClick={() => eliminar(s.id)} className="btn btn-sm btn-danger">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
