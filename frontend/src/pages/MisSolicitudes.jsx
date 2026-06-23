import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Play,
  Star,
  Search,
  Calendar,
  DollarSign,
  User,
  Clock,
  MapPin,
} from 'lucide-react';

const glassCard = {
  backgroundColor: 'rgba(255, 255, 255, 0.6)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(0, 0, 0, 0.05)',
};

const subtleBorder = '1px solid rgba(0, 0, 0, 0.05)';

const btnGradient = {
  color: 'white',
  background: 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)',
};

export default function MisSolicitudes() {
  const { usuario } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const endpoint = usuario?.rol === 'cliente' ? '/solicitudes/cliente' : '/solicitudes/proveedor';
    api.get(endpoint)
      .then((res) => setSolicitudes(res.data))
      .catch((err) => console.error('Error al cargar solicitudes:', err))
      .finally(() => setCargando(false));
  }, [usuario]);

  const cambiarEstado = async (id, estado) => {
    try {
      await api.put(`/solicitudes/${id}/estado`, { estado });
      const endpoint = usuario?.rol === 'cliente' ? '/solicitudes/cliente' : '/solicitudes/proveedor';
      const res = await api.get(endpoint);
      setSolicitudes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusStyle = (estado) => {
    const map = {
      pendiente: { bg: 'rgba(234, 179, 8, 0.1)', text: '#facc15', border: 'rgba(234, 179, 8, 0.2)', icon: Clock },
      aceptada: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.2)', icon: CheckCircle },
      en_proceso: { bg: 'rgba(168, 85, 247, 0.1)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.2)', icon: Play },
      completada: { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.2)', icon: CheckCircle },
      cancelada: { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.2)', icon: XCircle },
    };
    return map[estado] || { bg: 'rgba(255, 255, 255, 0.6)', text: 'oklch(0.45 0.03 240)', border: 'rgba(0, 0, 0, 0.05)', icon: ClipboardList };
  };

  if (cargando) {
    return (
      <DashboardLayout titulo="Mis Solicitudes" subtitulo={usuario?.rol === 'cliente' ? 'Solicitudes que has realizado' : 'Solicitudes que has recibido'}>
        <div className="flex items-center justify-center h-64" style={{ color: 'oklch(0.45 0.03 240)' }}>Cargando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout titulo="Mis Solicitudes" subtitulo={usuario?.rol === 'cliente' ? 'Solicitudes que has realizado' : 'Solicitudes que has recibido'}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <p className="text-sm" style={{ color: 'oklch(0.45 0.03 240)' }}>{solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''}</p>
        </div>

        {solicitudes.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={glassCard}>
            <ClipboardList size={48} className="mx-auto mb-4" style={{ opacity: 0.3, color: 'oklch(0.45 0.03 240)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: 'oklch(0.25 0.06 240)' }}>No hay solicitudes</h3>
            <p className="text-sm mb-6" style={{ color: 'oklch(0.45 0.03 240)' }}>
              {usuario?.rol === 'cliente'
                ? 'Busca servicios y solicita un profesional'
                : 'Aún no has recibido solicitudes'}
            </p>
            {usuario?.rol === 'cliente' && (
              <Link
                to="/buscar"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all text-sm font-semibold"
                style={btnGradient}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.45 0.18 255), oklch(0.77 0.13 200))'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)'; }}
              >
                <Search size={16} />
                Buscar Servicios
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {solicitudes.map((sol) => {
              const status = getStatusStyle(sol.estado);
              const StatusIcon = status.icon;
              return (
                <div
                  key={sol.id}
                  className="rounded-xl p-5 transition-all"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)'; }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: 'oklch(0.25 0.06 240)' }}>
                      {sol.servicio_titulo}
                    </h3>
                    <span
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full capitalize whitespace-nowrap ml-3"
                      style={{
                        backgroundColor: status.bg,
                        color: status.text,
                        border: `1px solid ${status.border}`,
                      }}
                    >
                      <StatusIcon size={12} />
                      {sol.estado.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'oklch(0.45 0.03 240)' }}>
                      <User size={14} />
                      <span>
                        {usuario?.rol === 'cliente'
                          ? `Proveedor: ${sol.proveedor_nombre} ${sol.proveedor_apellido}`
                          : `Cliente: ${sol.cliente_nombre} ${sol.cliente_apellido}`
                        }
                      </span>
                    </div>
                    {sol.descripcion && (
                      <p className="text-sm line-clamp-2" style={{ color: 'oklch(0.45 0.03 240)' }}>{sol.descripcion}</p>
                    )}
                    {sol.direccion && usuario?.rol === 'proveedor' && (
                      <div className="flex items-start gap-2 text-sm" style={{ color: 'oklch(0.45 0.03 240)' }}>
                        <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: 'oklch(0.40 0.18 255)' }} />
                        <span>{sol.direccion}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm" style={{ color: 'oklch(0.45 0.03 240)' }}>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {sol.fecha_solicitud ? new Date(sol.fecha_solicitud).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }) : ''}
                      </span>
                      <span className="flex items-center gap-1" style={{ color: 'oklch(0.40 0.18 255)' }}>
                        <DollarSign size={14} />
                        ${parseFloat(sol.tarifa || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {usuario?.rol === 'proveedor' && sol.estado === 'pendiente' && (
                    <div className="flex gap-2 pt-3" style={{ borderTop: subtleBorder }}>
                      <button
                        onClick={() => cambiarEstado(sol.id, 'aceptada')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)'; }}
                      >
                        <CheckCircle size={14} />
                        Aceptar
                      </button>
                      <button
                        onClick={() => cambiarEstado(sol.id, 'cancelada')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
                      >
                        <XCircle size={14} />
                        Rechazar
                      </button>
                    </div>
                  )}
                  {usuario?.rol === 'proveedor' && sol.estado === 'aceptada' && (
                    <div className="pt-3" style={{ borderTop: subtleBorder }}>
                      <button
                        onClick={() => cambiarEstado(sol.id, 'en_proceso')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; }}
                      >
                        <Play size={14} />
                        Iniciar Servicio
                      </button>
                    </div>
                  )}
                  {usuario?.rol === 'proveedor' && sol.estado === 'en_proceso' && (
                    <div className="pt-3" style={{ borderTop: subtleBorder }}>
                      <button
                        onClick={() => cambiarEstado(sol.id, 'completada')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#c084fc' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)'; }}
                      >
                        <CheckCircle size={14} />
                        Marcar Completada
                      </button>
                    </div>
                  )}
                  {usuario?.rol === 'cliente' && sol.estado === 'completada' && (
                    <div className="pt-3" style={{ borderTop: subtleBorder }}>
                      <Link
                        to={`/calificar/${sol.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)', color: '#ff6b35' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 107, 53, 0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 107, 53, 0.1)'; }}
                      >
                        <Star size={14} />
                        Calificar Servicio
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
