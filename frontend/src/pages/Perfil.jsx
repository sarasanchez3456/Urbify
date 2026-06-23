import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { User, Phone, MapPin as MapPinIcon, Save } from 'lucide-react';

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

export default function Perfil() {
  const { usuario } = useAuth();
  const [form, setForm] = useState({
    nombre: '', apellido: '', telefono: '', direccion: '',
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarPerfil = useCallback(() => {
    api.get('/auth/perfil')
      .then((res) => {
        const u = res.data;
        setForm({ nombre: u.nombre, apellido: u.apellido, telefono: u.telefono || '', direccion: u.direccion || '' });
      })
      .catch((err) => console.error('Error al cargar perfil:', err))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      await api.put('/auth/perfil', form);
      setMensaje('Perfil actualizado exitosamente');
    } catch (err) {
      setError('Error al actualizar perfil');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <DashboardLayout titulo="Mi Perfil" subtitulo="Administra tu información personal">
      <div className="max-w-3xl mx-auto">
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
            }}
          >
            {error}
          </div>
        )}
        {mensaje && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              color: '#4ade80',
            }}
          >
            {mensaje}
          </div>
        )}

        <div className="rounded-xl p-6 lg:p-8" style={glassCard}>
          {cargando ? (
            <div className="text-center py-12" style={{ color: 'oklch(0.45 0.03 240)' }}>Cargando...</div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-8 pb-6" style={{ borderBottom: subtleBorder }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  color: 'oklch(0.40 0.18 255)',
                }}>
                  {form.nombre?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-xl font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: 'oklch(0.25 0.06 240)' }}>
                    {form.nombre} {form.apellido}
                  </h2>
                  <span className="text-sm capitalize" style={{ color: 'oklch(0.45 0.03 240)' }}>{usuario?.rol}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1.5" style={{ color: 'oklch(0.45 0.03 240)' }}>Nombre</label>
                    <input
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 rounded-lg transition-colors"
                      style={{ ...glassInner, color: 'oklch(0.25 0.06 240)', outline: 'none' }}
                      onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.2)'; }}
                      onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)'; }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1.5" style={{ color: 'oklch(0.45 0.03 240)' }}>Apellido</label>
                    <input
                      value={form.apellido}
                      onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 rounded-lg transition-colors"
                      style={{ ...glassInner, color: 'oklch(0.25 0.06 240)', outline: 'none' }}
                      onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.2)'; }}
                      onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)'; }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'oklch(0.45 0.03 240)' }}>
                    <Phone size={14} className="inline mr-1" />
                    Teléfono
                  </label>
                  <input
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg transition-colors"
                    style={{ ...glassInner, color: 'oklch(0.25 0.06 240)', outline: 'none' }}
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.2)'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)'; }}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'oklch(0.45 0.03 240)' }}>
                    <MapPinIcon size={14} className="inline mr-1" />
                    Dirección
                  </label>
                  <input
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg transition-colors"
                    style={{ ...glassInner, color: 'oklch(0.25 0.06 240)', outline: 'none' }}
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.2)'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)'; }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-all disabled:opacity-50 text-sm font-semibold"
                  style={{
                    color: 'white',
                    background: 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)',
                  }}
                  onMouseEnter={(e) => { if (!guardando) e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.45 0.18 255), oklch(0.77 0.13 200))'; }}
                  onMouseLeave={(e) => { if (!guardando) e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)'; }}
                >
                  <Save size={16} />
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
