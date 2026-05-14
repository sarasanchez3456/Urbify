import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import api from '../api/axios';
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
    map.on('locationfound', (e) => {
      const { lat, lng } = e.latlng;
      onLocationFound(lat, lng);
      L.marker([lat, lng], { icon: userIcon }).addTo(map)
        .bindPopup('Tu ubicación').openPopup();
    });
  }, [map, onLocationFound]);

  return null;
}

export default function Mapa() {
  const [proveedores, setProveedores] = useState([]);
  const [coords, setCoords] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [radio, setRadio] = useState(5);

  const handleLocationFound = async (lat, lng) => {
    setCoords({ lat, lng });
    setCargando(true);
    try {
      const res = await api.get(`/proveedores/cercanos?lat=${lat}&lng=${lng}&radio=${radio}`);
      setProveedores(res.data);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (coords) {
      handleLocationFound(coords.lat, coords.lng);
    }
  }, [radio]);

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

      <div className="mapa-container">
        <MapContainer center={[19.4326, -99.1332]} zoom={12} className="mapa-leaflet">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker onLocationFound={handleLocationFound} />
          {proveedores.map((p) => (
            <Marker key={p.id} position={[parseFloat(p.latitud), parseFloat(p.longitud)]}>
              <Popup>
                <div className="popup-content">
                  <strong>{p.nombre} {p.apellido}</strong>
                  <p>⭐ {parseFloat(p.calificacion_promedio).toFixed(1)} ({p.total_calificaciones})</p>
                  <p>{p.servicios?.map((s) => s.titulo).join(', ')}</p>
                  <p className="popup-distancia">{parseFloat(p.distancia_km).toFixed(2)} km</p>
                  <Link to={`/servicio/${p.servicios?.[0]?.id}`} className="btn btn-primary btn-sm">
                    Ver Perfil
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="mapa-sidebar">
          <h3>Proveedores Cercanos ({proveedores.length})</h3>
          {cargando ? (
            <p className="loading">Cargando...</p>
          ) : proveedores.length === 0 ? (
            <p className="sin-proveedores">No se encontraron proveedores cercanos. Aumenta el radio de búsqueda.</p>
          ) : (
            <div className="proveedores-lista">
              {proveedores.map((p) => (
                <Link key={p.id} to={`/servicio/${p.servicios?.[0]?.id}`} className="proveedor-item">
                  <div className="proveedor-item-avatar">
                    {p.nombre[0]}{p.apellido[0]}
                  </div>
                  <div>
                    <strong>{p.nombre} {p.apellido}</strong>
                    <p>⭐ {parseFloat(p.calificacion_promedio).toFixed(1)}</p>
                    <p className="proveedor-item-distancia">{parseFloat(p.distancia_km).toFixed(2)} km</p>
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
