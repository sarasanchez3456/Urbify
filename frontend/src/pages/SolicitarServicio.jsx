import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { Send, ArrowLeft, Calendar, DollarSign, User, Briefcase, MapPin, Crosshair } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function DraggableMarker({ position, onMove }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return (
    <Marker
      draggable
      position={position}
      eventHandlers={{
        dragend(e) {
          const { lat, lng } = e.target.getLatLng();
          onMove(lat, lng);
        },
      }}
    />
  );
}

const glassCard = {
  backgroundColor: 'rgba(9, 35, 36, 0.4)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(169, 210, 182, 0.12)',
};

const glassInner = {
  backgroundColor: 'rgba(0, 17, 18, 0.4)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(169, 210, 182, 0.08)',
};

const btnGradient = {
  color: '#001718',
  background: 'linear-gradient(135deg, #a9d2b6, #1e4f43)',
};

export default function SolicitarServicio() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [servicio, setServicio] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [direccion, setDireccion] = useState('');
  const [latitud, setLatitud] = useState(null);
  const [longitud, setLongitud] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    if (usuario.rol !== 'cliente') {
      navigate('/login');
      return;
    }
    api.get(`/servicios/${id}`)
      .then((res) => setServicio(res.data))
      .catch(() => navigate('/buscar'))
      .finally(() => setCargando(false));
  }, [id, navigate, usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.post('/solicitudes', {
        proveedor_id: servicio.proveedor_id,
        servicio_id: Number(id),
        descripcion,
        fecha_servicio: fecha || null,
        direccion: direccion || null,
        latitud: latitud || null,
        longitud: longitud || null,
      });
      setExito(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar solicitud');
    } finally {
      setEnviando(false);
    }
  };

  const usarUbicacionActual = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitud(pos.coords.latitude);
        setLongitud(pos.coords.longitude);
      },
      () => setError('No se pudo obtener tu ubicación. Escríbela manualmente.')
    );
  };

  if (cargando) {
    return (
      <DashboardLayout titulo="Solicitar Servicio">
        <div className="flex items-center justify-center h-64" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>Cargando...</div>
      </DashboardLayout>
    );
  }

  if (exito) {
    return (
      <DashboardLayout titulo="Solicitar Servicio">
        <div className="max-w-lg mx-auto mt-12 text-center rounded-xl p-8" style={glassCard}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
            <Send size={32} style={{ color: '#4ade80' }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: '#cde8e8' }}>¡Solicitud enviada con éxito!</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>
            El proveedor recibirá una notificación y se pondrá en contacto contigo pronto.
          </p>
          <button
            onClick={() => navigate('/mis-solicitudes')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all text-sm font-semibold"
            style={btnGradient}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #bde2ca, #256f5a)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #a9d2b6, #1e4f43)'; }}
          >
            <ArrowLeft size={16} />
            Ver Mis Solicitudes
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout titulo="Solicitar Servicio" subtitulo="Describe lo que necesitas">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl p-6 lg:p-8" style={glassCard}>
          <div className="mb-6 p-4 rounded-lg space-y-2" style={glassInner}>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase size={14} style={{ color: '#a9d2b6' }} />
              <span style={{ color: 'rgba(193, 200, 193, 0.5)' }}>Servicio:</span>
              <span className="font-medium" style={{ color: '#cde8e8' }}>{servicio?.titulo}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User size={14} style={{ color: '#a9d2b6' }} />
              <span style={{ color: 'rgba(193, 200, 193, 0.5)' }}>Proveedor:</span>
              <span style={{ color: '#cde8e8' }}>{servicio?.nombre} {servicio?.apellido}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign size={14} style={{ color: '#a9d2b6' }} />
              <span style={{ color: 'rgba(193, 200, 193, 0.5)' }}>Tarifa:</span>
              <span className="font-medium" style={{ color: '#cde8e8' }}>${parseFloat(servicio?.tarifa || 0).toFixed(2)} / {servicio?.tipo_tarifa}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>Describe tu problema o necesidad</label>
              <textarea
                rows="5"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe qué necesitas, la dirección exacta, y cualquier detalle relevante..."
                required
                className="w-full px-4 py-2.5 rounded-lg transition-colors resize-none"
                style={{ ...glassInner, color: '#cde8e8', outline: 'none' }}
                onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(169, 210, 182, 0.5)'; }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(169, 210, 182, 0.08)'; }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>
                <Calendar size={14} className="inline mr-1" />
                Fecha preferida (opcional)
              </label>
              <input
                type="datetime-local"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg transition-colors"
                style={{ ...glassInner, color: '#cde8e8', outline: 'none' }}
                onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(169, 210, 182, 0.5)'; }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(169, 210, 182, 0.08)'; }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>
                <MapPin size={14} className="inline mr-1" />
                Dirección del servicio
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, número, colonia, ciudad..."
                  className="flex-1 px-4 py-2.5 rounded-lg transition-colors"
                  style={{ ...glassInner, color: '#cde8e8', outline: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(169, 210, 182, 0.5)'; }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(169, 210, 182, 0.08)'; }}
                />
                <button
                  type="button"
                  onClick={usarUbicacionActual}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                  style={{ backgroundColor: 'rgba(169, 210, 182, 0.1)', color: '#a9d2b6', border: '1px solid rgba(169, 210, 182, 0.2)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(169, 210, 182, 0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(169, 210, 182, 0.1)'; }}
                >
                  <Crosshair size={14} />
                  Mi ubicación
                </button>
              </div>
              <div className="rounded-lg overflow-hidden" style={{ height: 220, ...glassInner }}>
                <MapContainer
                  center={[latitud || 19.4326, longitud || -99.1332]}
                  zoom={latitud ? 15 : 5}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <RecenterMap lat={latitud} lng={longitud} />
                  {latitud && longitud && (
                    <DraggableMarker
                      position={[latitud, longitud]}
                      onMove={(lat, lng) => { setLatitud(lat); setLongitud(lng); }}
                    />
                  )}
                </MapContainer>
              </div>
              {latitud && longitud && (
                <p className="text-xs mt-1" style={{ color: 'rgba(193, 200, 193, 0.4)' }}>
                  {latitud.toFixed(6)}, {longitud.toFixed(6)} — Haz clic en el mapa o arrastra el marcador para ajustar
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-all disabled:opacity-50 text-sm font-semibold"
              style={btnGradient}
              onMouseEnter={(e) => { if (!enviando) e.currentTarget.style.background = 'linear-gradient(135deg, #bde2ca, #256f5a)'; }}
              onMouseLeave={(e) => { if (!enviando) e.currentTarget.style.background = 'linear-gradient(135deg, #a9d2b6, #1e4f43)'; }}
            >
              <Send size={16} />
              {enviando ? 'Enviando solicitud...' : 'Enviar Solicitud'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
