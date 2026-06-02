import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import {
  Users,
  CheckCircle2,
  Star,
  ClipboardList,
  ArrowUpRight,
  Search,
  MapPin,
  Wrench,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
} from 'lucide-react';

const glassCard = {
  backgroundColor: 'rgba(9, 35, 36, 0.4)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(169, 210, 182, 0.12)',
};

const glassCardHover = {
  backgroundColor: 'rgba(9, 35, 36, 0.55)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(169, 210, 182, 0.25)',
};

const subtleBorder = '1px solid rgba(169, 210, 182, 0.06)';

export default function Dashboard() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, solRes] = await Promise.all([
          api.get('/stats'),
          api.get(usuario?.rol === 'cliente' ? '/solicitudes/cliente' : '/solicitudes/proveedor'),
        ]);
        const sols = Array.isArray(solRes.data) ? solRes.data : [];
        setStats(statsRes.data);
        setSolicitudes(sols);
      } catch (err) {
        console.error('Error al cargar dashboard:', err);
      } finally {
        setCargando(false);
      }
    };
    fetchData();
  }, [usuario]);

  if (cargando) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div style={{ color: 'rgba(193, 200, 193, 0.5)' }}>Cargando...</div>
        </div>
      </DashboardLayout>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const statCards = [
    {
      label: 'Proveedores Activos',
      value: stats?.proveedores_activos || 0,
      icon: Users,
      change: '+12%',
    },
    {
      label: 'Servicios Realizados',
      value: stats?.servicios_realizados || 0,
      icon: CheckCircle2,
      change: '+8%',
    },
    {
      label: 'Calificación Media',
      value: stats?.calificacion_media || '0.0',
      icon: Star,
      change: '',
    },
    {
      label: usuario?.rol === 'proveedor' ? 'Solicitudes' : 'Mis Solicitudes',
      value: solicitudes.length,
      icon: ClipboardList,
      change: '',
    },
  ];

  const getStatusColor = (estado) => {
    const map = {
      pendiente: { bg: 'rgba(234, 179, 8, 0.1)', text: '#facc15', border: 'rgba(234, 179, 8, 0.2)' },
      aceptada: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.2)' },
      en_proceso: { bg: 'rgba(168, 85, 247, 0.1)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.2)' },
      completada: { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.2)' },
      cancelada: { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.2)' },
    };
    return map[estado] || { bg: 'rgba(9, 35, 36, 0.4)', text: 'rgba(193, 200, 193, 0.5)', border: 'rgba(169, 210, 182, 0.12)' };
  };

  const quickActions = usuario?.rol === 'proveedor'
    ? [
        { label: 'Publicar Servicio', icon: Wrench, path: '/mis-servicios', color: '#a9d2b6' },
        { label: 'Ver Solicitudes', icon: ClipboardList, path: '/mis-solicitudes', color: '#8eb69b' },
        { label: 'Mi Perfil', icon: User, path: '/perfil', color: '#60a5fa' },
        { label: 'Buscar', icon: Search, path: '/buscar', color: '#ff6b35' },
      ]
    : [
        { label: 'Buscar Servicios', icon: Search, path: '/buscar', color: '#a9d2b6' },
        { label: 'Mis Solicitudes', icon: ClipboardList, path: '/mis-solicitudes', color: '#8eb69b' },
        { label: 'Mi Perfil', icon: User, path: '/perfil', color: '#60a5fa' },
        { label: 'Ver Mapa', icon: MapPin, path: '/mapa', color: '#ff6b35' },
      ];

  const activityItems = [
    { icon: CheckCircle, color: '#a9d2b6', label: 'Plataforma operando al 100%', time: 'En línea' },
    { icon: Users, color: '#8eb69b', label: `${stats?.proveedores_activos || 0} proveedores activos`, time: 'Tiempo real' },
    { icon: CheckCircle2, color: '#4ade80', label: `${stats?.servicios_realizados || 0} servicios completados`, time: 'Total' },
    { icon: Star, color: '#ff6b35', label: `Calificación: ${stats?.calificacion_media || '0.0'} / 5.0`, time: 'General' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          {/* Hero Banner */}
          <div
            className="col-span-12 xl:col-span-8 rounded-xl relative overflow-hidden p-6 lg:p-8 flex flex-col justify-center min-h-[220px]"
            style={{
              ...glassCard,
              background: 'linear-gradient(135deg, rgba(9, 35, 36, 0.6), rgba(0, 23, 24, 0.9)), radial-gradient(circle at 20% 30%, rgba(169, 210, 182, 0.08) 0%, transparent 60%)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(169, 210, 182, 0.12)',
            }}
          >
            <div className="relative z-10">
              <span className="text-xs font-semibold px-3 py-1 rounded-full tracking-wider uppercase inline-block" style={{
                color: '#a9d2b6',
                backgroundColor: 'rgba(169, 210, 182, 0.1)',
                border: '1px solid rgba(169, 210, 182, 0.2)',
              }}>
                Plataforma Inteligente
              </span>
              <h2 className="text-2xl lg:text-3xl font-bold mt-4 leading-tight" style={{ fontFamily: "'Playfair Display', serif", color: '#cde8e8' }}>
                Conectamos <span style={{ color: 'rgba(193, 200, 193, 0.5)' }}>personas,</span><br />
                <span style={{ color: '#a9d2b6' }}>proyectos y servicios.</span>
              </h2>
              <p className="text-sm mt-3 max-w-md" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>
                Urbify centraliza todo lo que necesitas para encontrar profesionales y gestionar solicitudes de servicio de forma inteligente.
              </p>
              <div className="flex items-center gap-4 mt-5">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-bold" style={{
                      backgroundColor: 'rgba(9, 35, 36, 0.4)',
                      border: '2px solid #001718',
                      color: 'rgba(193, 200, 193, 0.5)',
                    }}>
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-bold" style={{
                    backgroundColor: 'rgba(9, 35, 36, 0.4)',
                    border: '2px solid #001718',
                    color: 'rgba(193, 200, 193, 0.5)',
                  }}>
                    +{stats?.proveedores_activos || 0}
                  </div>
                </div>
                <Link
                  to={usuario?.rol === 'proveedor' ? '/mis-servicios' : '/buscar'}
                  className="px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2"
                  style={{
                    color: '#001718',
                    background: 'linear-gradient(135deg, #a9d2b6, #1e4f43)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #bde2ca, #256f5a)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #a9d2b6, #1e4f43)';
                  }}
                >
                  {usuario?.rol === 'proveedor' ? 'Gestionar servicios' : 'Explorar servicios'}
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="col-span-12 xl:col-span-4 grid grid-cols-2 gap-4">
            {statCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="rounded-xl p-4 lg:p-5 flex flex-col justify-between"
                  style={glassCard}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>{card.label}</span>
                    <div className="w-7 h-7 rounded flex items-center justify-center" style={{
                      backgroundColor: 'rgba(169, 210, 182, 0.1)',
                      color: '#a9d2b6',
                      border: '1px solid rgba(169, 210, 182, 0.2)',
                    }}>
                      <Icon size={14} />
                    </div>
                  </div>
                  <div className="flex items-end gap-2 mt-3">
                    <span className="text-xl lg:text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#cde8e8' }}>
                      {card.value}
                    </span>
                    {card.change && (
                      <span className="text-xs font-medium flex items-center mb-1" style={{ color: '#a9d2b6' }}>
                        <ArrowUpRight size={12} />
                        {card.change}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content: 2 Columns */}
        <div className="grid grid-cols-12 gap-4 lg:gap-6 pb-8">
          {/* Left Column */}
          <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
            {/* Solicitudes Recientes */}
            <div className="rounded-xl p-5 lg:p-6" style={glassCard}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base lg:text-lg font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: '#cde8e8' }}>
                  Solicitudes Recientes
                </h3>
                <Link to="/mis-solicitudes" className="text-sm transition-colors" style={{ color: '#a9d2b6' }}>
                  Ver todas
                </Link>
              </div>

              {solicitudes.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>
                  <ClipboardList size={40} className="mx-auto mb-3" style={{ opacity: 0.3 }} />
                  <p className="text-sm">No hay solicitudes aún</p>
                  {usuario?.rol === 'cliente' && (
                    <Link to="/buscar" className="inline-block mt-3 text-sm" style={{ color: '#a9d2b6' }}>
                      Buscar servicios disponibles
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {solicitudes.slice(0, 4).map((sol) => {
                    const status = getStatusColor(sol.estado);
                    return (
                      <div
                        key={sol.id}
                        className="rounded-xl p-4 transition-all"
                        style={{
                          backgroundColor: 'rgba(0, 17, 18, 0.4)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(169, 210, 182, 0.08)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.border = '1px solid rgba(169, 210, 182, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.border = '1px solid rgba(169, 210, 182, 0.08)';
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-sm font-semibold truncate" style={{ fontFamily: "'Playfair Display', serif", color: '#cde8e8' }}>
                            {sol.servicio_titulo}
                          </h4>
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize whitespace-nowrap ml-2"
                            style={{
                              backgroundColor: status.bg,
                              color: status.text,
                              border: `1px solid ${status.border}`,
                            }}
                          >
                            {sol.estado.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs line-clamp-2 mb-3" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>
                          {sol.descripcion || 'Sin descripción'}
                        </p>
                        <div className="flex items-center justify-between text-xs pt-2" style={{
                          color: 'rgba(193, 200, 193, 0.5)',
                          borderTop: subtleBorder,
                        }}>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {sol.fecha_solicitud ? new Date(sol.fecha_solicitud).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''}
                          </span>
                          <span className="flex items-center gap-1 font-medium" style={{ color: '#a9d2b6' }}>
                            <DollarSign size={12} />
                            ${parseFloat(sol.tarifa || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
            {/* Accesos Rápidos */}
            <div className="rounded-xl p-5 lg:p-6" style={glassCard}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: "'Playfair Display', serif", color: '#cde8e8' }}>
                Accesos Rápidos
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={i}
                      to={action.path}
                      className="flex flex-col items-center justify-center gap-2 p-3 lg:p-4 rounded-xl transition-all group"
                      style={{
                        backgroundColor: 'rgba(0, 17, 18, 0.4)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(169, 210, 182, 0.08)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(21, 46, 47, 0.5)';
                        e.currentTarget.style.border = '1px solid rgba(169, 210, 182, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 17, 18, 0.4)';
                        e.currentTarget.style.border = '1px solid rgba(169, 210, 182, 0.08)';
                      }}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{
                        backgroundColor: 'rgba(169, 210, 182, 0.1)',
                        color: action.color,
                      }}>
                        <Icon size={18} />
                      </div>
                      <span className="text-[11px] text-center leading-tight" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>
                        {action.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Resumen */}
            <div className="rounded-xl p-5 lg:p-6 flex-1" style={glassCard}>
              <h3 className="text-base font-semibold mb-5" style={{ fontFamily: "'Playfair Display', serif", color: '#cde8e8' }}>
                Resumen
              </h3>
              <div className="space-y-4">
                {activityItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{
                        backgroundColor: `${item.color}15`,
                        color: item.color,
                      }}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: '#cde8e8' }}>{item.label}</p>
                        <p className="text-[11px]" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>{item.time}</p>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-2" style={{ backgroundColor: '#a9d2b6' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
