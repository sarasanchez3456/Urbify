import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Star, Navigation, Sliders, X, ChevronDown } from 'lucide-react';
import {
  COLOMBIA_CENTER,
  COLOMBIA_ZOOM,
  COLOMBIA_BOUNDS,
  geocodificarDireccion,
} from '../utils/colombia';

// ── Leaflet icon setup ──────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const proveedorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const hoveredIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [30, 49], iconAnchor: [15, 49], popupAnchor: [1, -34],
});

const colombiaBounds = L.latLngBounds(COLOMBIA_BOUNDS[0], COLOMBIA_BOUNDS[1]);

// ── Helper: auto-locate inside map ────────────────────────────────────────
function AutoLocator({ onFound }) {
  const map = useMap();
  useEffect(() => {
    let marker;
    map.locate({ setView: true, maxZoom: 14 });
    const onLocationFound = (e) => {
      if (colombiaBounds.contains(e.latlng)) {
        onFound(e.latlng.lat, e.latlng.lng);
        if (marker) marker.remove();
        marker = L.marker(e.latlng, { icon: userIcon }).addTo(map).bindPopup('Tu ubicación');
      } else {
        map.setView(COLOMBIA_CENTER, COLOMBIA_ZOOM);
        onFound(COLOMBIA_CENTER[0], COLOMBIA_CENTER[1]);
      }
    };
    const onError = () => {
      map.setView(COLOMBIA_CENTER, COLOMBIA_ZOOM);
      onFound(COLOMBIA_CENTER[0], COLOMBIA_CENTER[1]);
    };
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onError);
    return () => {
      if (marker) marker.remove();
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onError);
    };
  }, [map, onFound]);
  return null;
}

// ── Helper: pan map when coords change ────────────────────────────────────
function MapPanner({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView([coords.lat, coords.lng], 13, { animate: true });
  }, [coords?.lat, coords?.lng, map]);
  return null;
}

// ── Style tokens ─────────────────────────────────────────────────────────
const glass = {
  backgroundColor: 'rgba(255,255,255,0.65)',
  backdropFilter: 'blur(14px)',
  border: '1px solid rgba(0,0,0,0.06)',
};
const inputStyle = {
  backgroundColor: 'rgba(0,0,0,0.04)',
  border: '1px solid rgba(0,0,0,0.07)',
  color: 'oklch(0.25 0.06 240)',
};
const labelColor = { color: 'oklch(0.45 0.03 240)' };
const textPrimary = { color: 'oklch(0.25 0.06 240)' };
const textMuted = { color: 'oklch(0.55 0.03 240)' };
const accentGradient = 'linear-gradient(135deg, oklch(0.40 0.18 255), oklch(0.72 0.13 200))';

// ── Main page component ─────────────────────────────────────────────────
function BuscarContent() {
  const [searchParams] = useSearchParams();

  // Service list state
  const [categorias, setCategorias] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [filtros, setFiltros] = useState({
    q: searchParams.get('q') || '',
    categoria_id: searchParams.get('categoria_id') || '',
  });
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  // Map state
  const [coords, setCoords] = useState(null);
  const [pendingCoords, setPendingCoords] = useState(null); // coords ready to search but not yet submitted
  const [proveedores, setProveedores] = useState([]);
  const [cargandoMapa, setCargandoMapa] = useState(false);
  const [radio, setRadio] = useState(15);
  const [hoveredProveedor, setHoveredProveedor] = useState(null);
  const [autoLocate, setAutoLocate] = useState(false); // trigger for AutoLocator

  // Address autocomplete state
  const [busquedaDir, setBusquedaDir] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [buscandoDir, setBuscandoDir] = useState(false);
  const ubDebounce = useRef(null);
  const inputRef = useRef(null);

  // ── Load categories ──────────────────────────────────────────────────
  useEffect(() => {
    api.get('/categorias').then((r) => setCategorias(r.data)).catch(() => {});
  }, []);

  // ── Service search ───────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (filtros.q) params.append('q', filtros.q);
      if (filtros.categoria_id) params.append('categoria_id', filtros.categoria_id);
      params.append('disponible', '1');
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setCargandoServicios(true);
      api.get(`/servicios/buscar?${params}`, { signal: ctrl.signal })
        .then((r) => setServicios(r.data))
        .catch((e) => { if (e.name !== 'CanceledError') console.error(e); })
        .finally(() => setCargandoServicios(false));
    }, 300);
    return () => { clearTimeout(debounceRef.current); abortRef.current?.abort(); };
  }, [filtros]);

  // ── Address autocomplete ─────────────────────────────────────────────
  useEffect(() => {
    if (ubDebounce.current) clearTimeout(ubDebounce.current);
    if (busquedaDir.trim().length < 3) { setSugerencias([]); return; }
    setBuscandoDir(true);
    ubDebounce.current = setTimeout(async () => {
      const res = await geocodificarDireccion(busquedaDir).catch(() => []);
      setSugerencias(res);
      setBuscandoDir(false);
    }, 500);
    return () => clearTimeout(ubDebounce.current);
  }, [busquedaDir]);

  // ── Fetch providers ──────────────────────────────────────────────────
  const fetchProveedores = useCallback(async (lat, lng, r) => {
    setCargandoMapa(true);
    try {
      const res = await api.get(`/proveedores/cercanos?lat=${lat}&lng=${lng}&radio=${r}`);
      setProveedores(res.data);
    } catch (e) {
      console.error('Error al cargar proveedores:', e);
    } finally {
      setCargandoMapa(false);
    }
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleSelectSugerencia = (s) => {
    setBusquedaDir(s.display_name.split(',').slice(0, 2).join(',').trim());
    setSugerencias([]);
    setPendingCoords({ lat: s.lat, lng: s.lon });
  };

  const handleBuscarEnMapa = async () => {
    let c = pendingCoords || coords;
    
    // Si no ha seleccionado de la lista, pero escribió algo, intentamos buscar la dirección directamente
    if (!c && busquedaDir.trim().length >= 3) {
      setBuscandoDir(true);
      try {
        let res = await geocodificarDireccion(busquedaDir);
        // Fallback: si no encuentra nada, intentar añadiendo la ciudad
        if (res.length === 0 && !busquedaDir.toLowerCase().includes('medellin') && !busquedaDir.toLowerCase().includes('medellín')) {
          res = await geocodificarDireccion(`${busquedaDir}, Medellín`);
        }
        
        if (res.length > 0) {
          c = { lat: res[0].lat, lng: res[0].lon };
          setBusquedaDir(res[0].display_name.split(',')[0]);
        } else {
          alert('No se encontró la dirección. Intenta ser más general o añadir la ciudad.');
        }
      } catch (e) {
        console.error(e);
      }
      setBuscandoDir(false);
    }

    if (!c) return;

    setCoords(c);
    setPendingCoords(null);
    setSugerencias([]);
    fetchProveedores(c.lat, c.lng, radio);
  };

  const handleMiUbicacion = () => {
    setBusquedaDir('');
    setSugerencias([]);
    setPendingCoords(null);
    setAutoLocate(false);
    setTimeout(() => setAutoLocate(true), 50);
  };

  const handleAutoLocated = useCallback((lat, lng) => {
    const c = { lat, lng };
    setCoords(c);
    fetchProveedores(lat, lng, radio);
  }, [fetchProveedores, radio]);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Removed page header as requested */}

      {/* ── Service search filters ────────────────────────────────────── */}
      <div className="rounded-2xl p-4" style={glass}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={textMuted} />
            <input
              placeholder="Buscar servicio por palabra clave..."
              value={filtros.q}
              onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={inputStyle}
            />
          </div>
          <div className="relative shrink-0">
            <select
              value={filtros.categoria_id}
              onChange={(e) => setFiltros({ ...filtros, categoria_id: e.target.value })}
              className="appearance-none pl-4 pr-9 py-2.5 rounded-xl text-sm outline-none cursor-pointer min-w-[180px] w-full"
              style={inputStyle}
            >
              <option value="" style={{ backgroundColor: 'white' }}>Todas las categorías</option>
              {categorias.map((c) => <option key={c.id} value={c.id} style={{ backgroundColor: 'white' }}>{c.nombre}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={textMuted} />
          </div>
        </div>
      </div>

      {/* ── Main layout: services left + map right ────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* ── Left: service cards ─────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {cargandoServicios ? (
            <div className="flex items-center justify-center py-16 rounded-2xl" style={glass}>
              <div className="text-center">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
                  style={{ borderColor: 'oklch(0.40 0.18 255)', borderTopColor: 'transparent' }} />
                <p className="text-sm" style={labelColor}>Buscando servicios...</p>
              </div>
            </div>
          ) : servicios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl" style={glass}>
              <Search size={40} className="mb-3" style={{ color: 'oklch(0.75 0.03 240)' }} />
              <p className="font-semibold text-sm" style={textPrimary}>Sin resultados</p>
              <p className="text-xs mt-1" style={labelColor}>Prueba con otras palabras o categorías</p>
            </div>
          ) : (
            servicios.map((s) => (
              <Link
                key={s.id}
                to={`/servicio/${s.id}`}
                className="block rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5"
                style={glass}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: accentGradient }}>
                      {s.nombre?.[0]}{s.apellido?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={textPrimary}>{s.nombre} {s.apellido}</p>
                      <p className="text-xs" style={textMuted}>{s.categoria_nombre}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold" style={textPrimary}>
                      {parseFloat(s.calificacion_promedio || 0).toFixed(1)}
                    </span>
                    <span className="text-xs" style={textMuted}>({s.total_calificaciones})</span>
                  </div>
                </div>
                <h3 className="text-base font-semibold mb-1" style={{ fontFamily: "'Playfair Display', serif", ...textPrimary }}>
                  {s.titulo}
                </h3>
                <p className="text-sm mb-3 line-clamp-2" style={labelColor}>{s.descripcion}</p>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <span className="text-base font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'oklch(0.40 0.18 255)' }}>
                    ${parseFloat(s.tarifa || 0).toFixed(2)}
                    <span className="text-xs font-normal ml-1" style={textMuted}>/{s.tipo_tarifa}</span>
                  </span>
                  {s.direccion && (
                    <span className="flex items-center gap-1 text-xs" style={textMuted}>
                      <MapPin size={11} />{s.direccion}
                    </span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* ── Right: map section ──────────────────────────────────────── */}
        <div className="flex flex-col gap-3">

          {/* Map controls card */}
          <div className="rounded-2xl p-4" style={{ ...glass, position: 'relative', zIndex: 50 }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'oklch(0.50 0.06 240)' }}>
              Proveedores en el mapa
            </p>

            {/* Location row */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              {/* Address input — high z-index so suggestions float above map */}
              <div className="flex-1 relative" style={{ zIndex: 1500 }}>
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'oklch(0.40 0.18 255)' }} />
                <input
                  ref={inputRef}
                  placeholder="Escribe tu dirección o ciudad..."
                  value={busquedaDir}
                  onChange={(e) => setBusquedaDir(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={inputStyle}
                />
                {busquedaDir && (
                  <button
                    onClick={() => { setBusquedaDir(''); setSugerencias([]); setPendingCoords(null); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X size={13} style={textMuted} />
                  </button>
                )}

                {/* Dropdown — always on top of everything */}
                {(sugerencias.length > 0 || buscandoDir) && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl"
                    style={{ backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.08)', zIndex: 9999 }}
                  >
                    {buscandoDir && (
                      <div className="px-4 py-3 text-sm" style={labelColor}>Buscando...</div>
                    )}
                    {sugerencias.map((s, i) => (
                      <button
                        key={i}
                        onMouseDown={(e) => { e.preventDefault(); handleSelectSugerencia(s); }}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-start gap-2 transition-colors hover:bg-black/5"
                        style={{ ...textPrimary, borderBottom: i < sugerencias.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                      >
                        <MapPin size={13} className="shrink-0 mt-0.5" style={{ color: 'oklch(0.40 0.18 255)' }} />
                        <span className="line-clamp-2 text-xs">{s.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mi ubicación button */}
              <button
                onClick={handleMiUbicacion}
                className="shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                style={{ backgroundColor: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)', color: 'oklch(0.40 0.18 255)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.07)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'; }}
              >
                <Navigation size={14} />
                <span className="hidden sm:inline">Mi ubicación</span>
              </button>

              {/* Buscar button */}
              <button
                onClick={handleBuscarEnMapa}
                disabled={!pendingCoords && !coords && busquedaDir.trim().length < 3}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 whitespace-nowrap"
                style={{ background: accentGradient }}
                onMouseEnter={(e) => { if (pendingCoords || coords || busquedaDir.trim().length >= 3) e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <Search size={14} />
                Buscar
              </button>
            </div>

            {/* Radio slider */}
            <div className="flex items-center gap-3">
              <Sliders size={13} style={{ color: 'oklch(0.55 0.03 240)', flexShrink: 0 }} />
              <span className="text-xs shrink-0" style={labelColor}>Radio:</span>
              <input
                type="range" min="1" max="50" value={radio}
                onChange={(e) => setRadio(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: 'oklch(0.40 0.18 255)' }}
              />
              <span className="text-xs font-semibold shrink-0" style={{ color: 'oklch(0.40 0.18 255)', minWidth: 36 }}>
                {radio} km
              </span>
            </div>
          </div>

          {/* Map container */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ height: 380, border: '1px solid rgba(0,0,0,0.06)', position: 'relative', zIndex: 10 }}
          >
            <MapContainer
              center={COLOMBIA_CENTER}
              zoom={COLOMBIA_ZOOM}
              minZoom={5}
              maxBounds={colombiaBounds}
              maxBoundsViscosity={1.0}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Auto-locate trigger */}
              {autoLocate && <AutoLocator onFound={handleAutoLocated} key={String(autoLocate)} />}

              {/* Pan to manual coords */}
              {pendingCoords && <MapPanner coords={pendingCoords} />}

              {/* User marker + radius circle */}
              {coords && (
                <>
                  <Marker position={[coords.lat, coords.lng]} icon={userIcon}>
                    <Popup><strong>Tu ubicación</strong></Popup>
                  </Marker>
                  <Circle
                    center={[coords.lat, coords.lng]}
                    radius={radio * 1000}
                    pathOptions={{
                      color: 'oklch(0.40 0.18 255)',
                      fillColor: 'oklch(0.40 0.18 255)',
                      fillOpacity: 0.06,
                      weight: 1.5,
                      dashArray: '6 4',
                    }}
                  />
                </>
              )}

              {/* Provider markers */}
              {proveedores.map((p) => (
                <Marker
                  key={p.id}
                  position={[parseFloat(p.latitud), parseFloat(p.longitud)]}
                  icon={hoveredProveedor?.id === p.id ? hoveredIcon : proveedorIcon}
                >
                  <Popup>
                    <div style={{ minWidth: 150 }}>
                      <p className="font-semibold text-sm mb-0.5">{p.nombre} {p.apellido}</p>
                      <p className="text-xs text-amber-500">
                        ⭐ {parseFloat(p.calificacion_promedio || 0).toFixed(1)} · {parseFloat(p.distancia_km || 0).toFixed(1)} km
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 mb-2 line-clamp-1">
                        {p.servicios?.map((s) => s.titulo).join(', ')}
                      </p>
                      {p.servicios?.[0]?.id && (
                        <Link
                          to={`/servicio/${p.servicios[0].id}`}
                          className="block text-center text-xs font-semibold py-1.5 px-3 rounded-lg text-white"
                          style={{ background: accentGradient }}
                        >
                          Ver servicio
                        </Link>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Loading overlay */}
            {cargandoMapa && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.6)', zIndex: 500 }}>
                <div className="flex items-center gap-2 text-sm" style={textPrimary}>
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'oklch(0.40 0.18 255)', borderTopColor: 'transparent' }} />
                  Buscando proveedores...
                </div>
              </div>
            )}

            {/* Empty state overlay */}
            {!coords && !cargandoMapa && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none" style={{ zIndex: 400 }}>
                <div className="rounded-2xl px-5 py-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <Navigation size={28} className="mx-auto mb-2" style={{ color: 'oklch(0.60 0.03 240)' }} />
                  <p className="text-sm font-medium" style={textPrimary}>Ingresa tu ubicación</p>
                  <p className="text-xs mt-0.5" style={labelColor}>Escribe tu dirección o usa "Mi ubicación"</p>
                </div>
              </div>
            )}
          </div>

          {/* Provider list (below map) */}
          {(proveedores.length > 0 || (coords && !cargandoMapa)) && (
            <div className="rounded-2xl p-4" style={glass}>
              <p className="text-sm font-semibold mb-3" style={{ fontFamily: "'Playfair Display', serif", ...textPrimary }}>
                {proveedores.length > 0
                  ? `${proveedores.length} proveedor${proveedores.length !== 1 ? 'es' : ''} encontrado${proveedores.length !== 1 ? 's' : ''} en ${radio} km`
                  : 'Sin proveedores en este radio'}
              </p>

              {proveedores.length === 0 ? (
                <p className="text-sm" style={labelColor}>Intenta aumentar el radio de búsqueda y presiona "Buscar" de nuevo.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {proveedores.map((p) => (
                    <Link
                      key={p.id}
                      to={p.servicios?.[0]?.id ? `/servicio/${p.servicios[0].id}` : '#'}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all duration-150"
                      style={{
                        backgroundColor: hoveredProveedor?.id === p.id ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.03)',
                        border: hoveredProveedor?.id === p.id ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(0,0,0,0.04)',
                      }}
                      onMouseEnter={() => setHoveredProveedor(p)}
                      onMouseLeave={() => setHoveredProveedor(null)}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: accentGradient }}>
                        {p.nombre?.[0]}{p.apellido?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={textPrimary}>{p.nombre} {p.apellido}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-0.5 text-xs">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            <span style={{ color: 'oklch(0.35 0.03 240)' }}>{parseFloat(p.calificacion_promedio || 0).toFixed(1)}</span>
                          </span>
                          <span className="text-xs" style={textMuted}>·</span>
                          <span className="flex items-center gap-0.5 text-xs" style={textMuted}>
                            <MapPin size={10} />{parseFloat(p.distancia_km || 0).toFixed(1)} km
                          </span>
                          {p.servicios?.length > 0 && (
                            <>
                              <span className="text-xs" style={textMuted}>·</span>
                              <span className="text-xs truncate" style={textMuted}>{p.servicios[0].titulo}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────
export default function Buscar() {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;

  if (usuario) {
    return (
      <DashboardLayout titulo="Explorar Servicios" subtitulo="Encuentra servicios y proveedores cerca de ti">
        <BuscarContent />
      </DashboardLayout>
    );
  }

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
        <BuscarContent />
      </div>
    </div>
  );
}
