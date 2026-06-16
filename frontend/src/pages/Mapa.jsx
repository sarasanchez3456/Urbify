import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import './Mapa.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function LocationMarker({ onLocationFound }) {
  const map = useMap();

  useEffect(() => {
    map.locate({ setView: true, maxZoom: 14 });
    const handleLocationFound = (e) => {
      const { lat, lng } = e.latlng;
      onLocationFound(lat, lng);
      L.marker([lat, lng], { icon: userIcon }).addTo(map)
        .bindPopup('Tu ubicación').openPopup();
    };
    map.on('locationfound', handleLocationFound);
    return () => {
      try { map.stop(); } catch (_) {}
      map.off('locationfound', handleLocationFound);
    };
  }, [map, onLocationFound]);

  return null;
}

function MapaContent() {
  const [proveedores, setProveedores] = useState([]);
  const [coords, setCoords] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [radio, setRadio] = useState(5);
  const radioRef = useRef(radio);

  useEffect(() => {
    radioRef.current = radio;
  }, [radio]);

  const handleLocationFound = useCallback(async (lat, lng) => {
    setCoords({ lat, lng });
    setCargando(true);
    try {
      const res = await api.get(`/proveedores/cercanos?lat=${lat}&lng=${lng}&radio=${radioRef.current}`);
      setProveedores(res.data);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (coords) {
      handleLocationFound(coords.lat, coords.lng);
    }
  }, [radio, coords, handleLocationFound]);

  return (
    <div className="mapa-page">
      <div className="container page-header">
        <h1>Mapa de Proveedores</h1>
        <p>Encuentra profesionales cerca de ti</p>
        <div className="mapa-controls">
          <label>Radio de búsqueda: {radio} km</label>
          <input
            type="range"
            min="1"
            max="50"
            value={radio}
            onChange={(e) => setRadio(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="mapa-container bg-[#020617]/50 backdrop-blur-xl border border-cyan-500/20 rounded-3xl overflow-hidden">
        <MapContainer center={[19.4326, -99.1332]} zoom={12} className="mapa-leaflet">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <LocationMarker onLocationFound={handleLocationFound} />
          {proveedores.map((p) => (
            <Marker key={p.id} position={[parseFloat(p.latitud), parseFloat(p.longitud)]}>
              <Popup>
                <div className="popup-content bg-[#020617] text-white p-2">
                  <strong className="text-cyan-400">{p.nombre} {p.apellido}</strong>
                  <p>⭐ {parseFloat(p.calificacion_promedio || 0).toFixed(1)} ({p.total_calificaciones})</p>
                  <p className="text-xs text-gray-400">{p.servicios?.map((s) => s.titulo).join(', ')}</p>
                  <p className="popup-distancia text-fuchsia-400 font-bold">{parseFloat(p.distancia_km || 0).toFixed(2)} km</p>
                  <Link to={p.servicios?.[0]?.id ? `/servicio/${p.servicios[0].id}` : '#'} className="btn-premium-sm">
                    Ver Perfil
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="mapa-sidebar bg-[#020617]/80 backdrop-blur-md border-l border-cyan-500/20 text-white p-6">
          <h3 className="font-['Orbitron'] text-cyan-400 mb-4">Proveedores Cercanos ({proveedores.length})</h3>
          {cargando ? (
            <p className="loading text-cyan-500">Cargando...</p>
          ) : proveedores.length === 0 ? (
            <p className="sin-proveedores text-gray-400">No se encontraron proveedores cercanos. Aumenta el radio de búsqueda.</p>
          ) : (
            <div className="proveedores-lista flex flex-col gap-3">
              {proveedores.map((p) => (
                <Link key={p.id} to={p.servicios?.[0]?.id ? `/servicio/${p.servicios[0].id}` : '#'} className="proveedor-item bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition-all">
                  <div className="proveedor-item-avatar bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-black font-bold">
                    {p.nombre?.[0]}{p.apellido?.[0]}
                  </div>
                  <div>
                    <strong className="text-white">{p.nombre} {p.apellido}</strong>
                    <p className="text-yellow-400">⭐ {parseFloat(p.calificacion_promedio || 0).toFixed(1)}</p>
                    <p className="proveedor-item-distancia text-cyan-400 text-xs">{parseFloat(p.distancia_km || 0).toFixed(2)} km</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Mapa() {
  const { usuario } = useAuth();

  if (usuario) {
    return (
      <DashboardLayout titulo="Mapa de Proveedores" subtitulo="Encuentra profesionales cerca de ti">
        <MapaContent />
      </DashboardLayout>
    );
  }

  return <MapaContent />;
}
