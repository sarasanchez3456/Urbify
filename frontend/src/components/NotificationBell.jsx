import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  ClipboardCheck,
  CheckCheck,
  Trash2,
  X,
  Inbox,
} from 'lucide-react';

function formatearTiempo(fechaStr) {
  if (!fechaStr) return '';
  const fecha = new Date(fechaStr);
  const ahora = new Date();
  const diffSeg = Math.floor((ahora - fecha) / 1000);

  if (diffSeg < 30) return 'Justo ahora';
  if (diffSeg < 60) return `Hace ${diffSeg}s`;
  const diffMin = Math.floor(diffSeg / 60);
  if (diffMin < 60) return `Hace ${diffMin}m`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `Hace ${diffHoras}h`;
  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias === 1) return 'Ayer';
  if (diffDias < 7) return `Hace ${diffDias}d`;
  return fecha.toLocaleDateString();
}

function getNotificationIcon(mensaje = '') {
  const m = mensaje.toLowerCase();
  if (m.includes('aceptó') || m.includes('aceptada')) {
    return { Icon: CheckCircle2, bg: 'rgba(34, 197, 94, 0.15)', color: '#16a34a' };
  }
  if (m.includes('canceló') || m.includes('cancelada')) {
    return { Icon: XCircle, bg: 'rgba(239, 68, 68, 0.15)', color: '#dc2626' };
  }
  if (m.includes('completó') || m.includes('completada') || m.includes('califica')) {
    return { Icon: Star, bg: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04' };
  }
  if (m.includes('inició')) {
    return { Icon: Clock, bg: 'rgba(168, 85, 247, 0.15)', color: '#9333ea' };
  }
  return { Icon: ClipboardCheck, bg: 'rgba(59, 130, 246, 0.15)', color: '#2563eb' };
}

export default function NotificationBell() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [notificaciones, setNotificaciones] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const dropdownRef = useRef(null);

  const cargarNotificaciones = async () => {
    if (!usuario) return;
    try {
      const res = await api.get('/notificaciones');
      setNotificaciones(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error al cargar notificaciones:', err);
    }
  };

  useEffect(() => {
    cargarNotificaciones();

    // Sondeo periódico cada 6 segundos para recibir notificaciones en tiempo real
    const intervalo = setInterval(cargarNotificaciones, 6000);

    // Escuchar evento personalizado emitido al crear o cambiar estado de solicitudes
    const handleActualizacion = () => cargarNotificaciones();
    window.addEventListener('notificacion_actualizada', handleActualizacion);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener('notificacion_actualizada', handleActualizacion);
    };
  }, [usuario]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAbierto(false);
      }
    }
    if (abierto) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [abierto]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const handleMarcarLeida = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notificaciones/${id}/leer`);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: 1 } : n))
      );
    } catch (err) {
      console.error('Error al marcar leída:', err);
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      setCargando(true);
      await api.put('/notificaciones/leer-todas');
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: 1 })));
    } catch (err) {
      console.error('Error al marcar todas leídas:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/notificaciones/${id}`);
      setNotificaciones((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Error al eliminar notificación:', err);
    }
  };

  const handleItemClick = async (item) => {
    if (!item.leida) {
      await handleMarcarLeida(item.id);
    }
    setAbierto(false);
    navigate('/mis-solicitudes');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de la campana */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-label="Notificaciones"
        className="relative p-2.5 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center"
        style={{
          color: abierto || noLeidas > 0 ? 'oklch(0.40 0.18 255)' : 'oklch(0.45 0.03 240)',
          backgroundColor: abierto ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        }}
        onMouseLeave={(e) => {
          if (!abierto) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Bell size={20} className={noLeidas > 0 ? 'animate-bounce-short' : ''} />

        {/* Badge contador de no leídas */}
        {noLeidas > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full flex items-center justify-center shadow-md animate-pulse"
            style={{
              backgroundColor: '#ef4444',
              boxShadow: '0 0 0 2px white',
            }}
          >
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* Menú desplegable flotante */}
      {abierto && (
        <div
          className="absolute right-0 top-full mt-3 w-80 sm:w-96 rounded-2xl shadow-2xl z-[999] overflow-hidden transition-all duration-200 border"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            borderColor: 'rgba(0, 0, 0, 0.08)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{ borderColor: 'rgba(0, 0, 0, 0.06)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-bold tracking-tight"
                style={{ color: 'oklch(0.25 0.06 240)' }}
              >
                Notificaciones
              </span>
              {noLeidas > 0 && (
                <span
                  className="px-2 py-0.5 text-[11px] font-semibold rounded-full"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    color: '#2563eb',
                  }}
                >
                  {noLeidas} nueva{noLeidas > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {noLeidas > 0 && (
              <button
                type="button"
                onClick={handleMarcarTodasLeidas}
                disabled={cargando}
                className="flex items-center gap-1 text-[11px] font-medium transition-colors hover:underline cursor-pointer"
                style={{ color: 'oklch(0.40 0.18 255)' }}
                title="Marcar todas como leídas"
              >
                <CheckCheck size={13} />
                <span>Marcar leídas</span>
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100/80">
            {notificaciones.length === 0 ? (
              <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}
                >
                  <Inbox size={22} style={{ color: 'oklch(0.55 0.03 240)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'oklch(0.35 0.05 240)' }}>
                  No tienes notificaciones
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Aquí verás las solicitudes recibidas y las actualizaciones de tus servicios.
                </p>
              </div>
            ) : (
              notificaciones.map((item) => {
                const { Icon, bg, color } = getNotificationIcon(item.mensaje);
                const esNoLeida = !item.leida;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="group relative flex items-start gap-3.5 p-4 transition-all duration-150 cursor-pointer text-left"
                    style={{
                      backgroundColor: esNoLeida ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = esNoLeida
                        ? 'rgba(59, 130, 246, 0.08)'
                        : 'rgba(0, 0, 0, 0.025)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = esNoLeida
                        ? 'rgba(59, 130, 246, 0.04)'
                        : 'transparent';
                    }}
                  >
                    {/* Icono temático */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: bg, color }}
                    >
                      <Icon size={18} />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0 pr-6">
                      <p
                        className={`text-xs leading-relaxed ${
                          esNoLeida ? 'font-semibold text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {item.mensaje}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {formatearTiempo(item.fecha_creacion)}
                      </span>
                    </div>

                    {/* Botón borrar / indicador */}
                    <div className="absolute right-3 top-3.5 flex items-center gap-1.5">
                      {esNoLeida && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: 'oklch(0.40 0.18 255)' }}
                          title="No leída"
                        />
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleEliminar(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all cursor-pointer"
                        title="Eliminar notificación"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-2.5 bg-gray-50/80 border-t flex items-center justify-between text-xs"
            style={{ borderColor: 'rgba(0, 0, 0, 0.06)' }}
          >
            <span className="text-gray-400 text-[11px]">
              {usuario?.rol === 'proveedor' ? 'Panel de Proveedor' : 'Panel de Cliente'}
            </span>
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                navigate('/mis-solicitudes');
              }}
              className="font-medium hover:underline cursor-pointer"
              style={{ color: 'oklch(0.40 0.18 255)' }}
            >
              Ver mis solicitudes →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
