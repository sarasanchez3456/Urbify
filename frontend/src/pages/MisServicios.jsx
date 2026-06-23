import { useState, useEffect } from 'react';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import { Plus, ToggleLeft, ToggleRight, Trash2, Wrench, AlertCircle } from 'lucide-react';

const glassCard = {
  backgroundColor: 'rgba(255, 255, 255, 0.6)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(0, 0, 0, 0.05)',
};

const glassInner = {
  backgroundColor: 'rgba(255, 255, 255, 0.6)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(0, 0, 0, 0.05)',
};

const subtleBorder = '1px solid rgba(0, 0, 0, 0.05)';

const btnGradient = {
  color: 'white',
  background: 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)',
};

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
      .catch((err) => console.error('Error al cargar servicios:', err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarServicios();
    api.get('/categorias').then((res) => setCategorias(res.data)).catch((err) => console.error('Error al cargar categorías:', err));
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/servicios', { ...form, tarifa: parseFloat(form.tarifa || 0) });
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

  if (cargando) {
    return (
      <DashboardLayout titulo="Mis Servicios" subtitulo="Gestiona los servicios que ofreces">
        <div className="flex items-center justify-center h-64" style={{ color: 'oklch(0.45 0.03 240)' }}>Cargando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout titulo="Mis Servicios" subtitulo="Gestiona los servicios que ofreces como proveedor">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm" style={{ color: 'oklch(0.45 0.03 240)' }}>{servicios.length} servicio{servicios.length !== 1 ? 's' : ''} publicados</p>
          </div>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all text-sm font-semibold"
            style={btnGradient}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.45 0.18 255), oklch(0.77 0.13 200))'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)'; }}
          >
            <Plus size={16} />
            {mostrarForm ? 'Cancelar' : 'Nuevo Servicio'}
          </button>
        </div>

        {mostrarForm && (
          <div className="rounded-xl p-6" style={glassCard}>
            <h3 className="text-lg font-semibold mb-5" style={{ fontFamily: "'Playfair Display', serif", color: 'oklch(0.25 0.06 240)' }}>Crear Nuevo Servicio</h3>
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <form onSubmit={handleCrear} className="space-y-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'oklch(0.45 0.03 240)' }}>Categoría</label>
                <select
                  value={form.categoria_id}
                  onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg transition-colors"
                  style={{ ...glassInner, color: 'oklch(0.25 0.06 240)', outline: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.2)'; }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)'; }}
                >
                  <option value="" style={{ backgroundColor: 'white' }}>Seleccionar categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id} style={{ backgroundColor: 'white' }}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'oklch(0.45 0.03 240)' }}>Título del servicio</label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg transition-colors"
                  style={{ ...glassInner, color: 'oklch(0.25 0.06 240)', outline: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.2)'; }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)'; }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'oklch(0.45 0.03 240)' }}>Descripción</label>
                <textarea
                  rows="3"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg transition-colors resize-none"
                  style={{ ...glassInner, color: 'oklch(0.25 0.06 240)', outline: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.2)'; }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)'; }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'oklch(0.45 0.03 240)' }}>Tarifa</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.tarifa}
                    onChange={(e) => setForm({ ...form, tarifa: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-lg transition-colors"
                    style={{ ...glassInner, color: 'oklch(0.25 0.06 240)', outline: 'none' }}
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.2)'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)'; }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'oklch(0.45 0.03 240)' }}>Tipo de tarifa</label>
                  <select
                    value={form.tipo_tarifa}
                    onChange={(e) => setForm({ ...form, tipo_tarifa: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg transition-colors"
                    style={{ ...glassInner, color: 'oklch(0.25 0.06 240)', outline: 'none' }}
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.2)'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)'; }}
                  >
                    <option value="hora" style={{ backgroundColor: 'white' }}>Por hora</option>
                    <option value="fijo" style={{ backgroundColor: 'white' }}>Precio fijo</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg transition-all text-sm font-semibold"
                style={btnGradient}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.45 0.18 255), oklch(0.77 0.13 200))'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)'; }}
              >
                Crear Servicio
              </button>
            </form>
          </div>
        )}

        {servicios.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={glassCard}>
            <Wrench size={48} className="mx-auto mb-4" style={{ opacity: 0.3, color: 'oklch(0.45 0.03 240)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: 'oklch(0.25 0.06 240)' }}>No tienes servicios publicados</h3>
            <p className="text-sm mb-6" style={{ color: 'oklch(0.45 0.03 240)' }}>Crea tu primer servicio para empezar a recibir solicitudes</p>
            <button
              onClick={() => setMostrarForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all text-sm font-semibold"
              style={btnGradient}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.45 0.18 255), oklch(0.77 0.13 200))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)'; }}
            >
              <Plus size={16} />
              Crear Servicio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servicios.map((s) => (
              <div
                key={s.id}
                className="rounded-xl p-5 transition-all"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)'; }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                      color: 'oklch(0.40 0.18 255)',
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }}>{s.categoria_nombre}</span>
                    <h3 className="text-base font-semibold mt-2" style={{ fontFamily: "'Playfair Display', serif", color: 'oklch(0.25 0.06 240)' }}>{s.titulo}</h3>
                  </div>
                  <span className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'oklch(0.40 0.18 255)' }}>
                    ${parseFloat(s.tarifa || 0).toFixed(2)}<span className="text-xs" style={{ color: 'oklch(0.45 0.03 240)' }}>/{s.tipo_tarifa}</span>
                  </span>
                </div>
                <p className="text-sm mb-4 line-clamp-2" style={{ color: 'oklch(0.45 0.03 240)' }}>{s.descripcion}</p>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: subtleBorder }}>
                  <button
                    onClick={() => toggleDisponible(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: s.disponible ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                      color: s.disponible ? '#4ade80' : '#facc15',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = s.disponible ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = s.disponible ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)'; }}
                  >
                    {s.disponible ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {s.disponible ? 'Disponible' : 'Pausado'}
                  </button>
                  <button
                    onClick={() => eliminar(s.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
