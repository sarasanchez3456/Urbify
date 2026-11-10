import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import {
  COLOMBIA_CENTER, COLOMBIA_ZOOM, COLOMBIA_BOUNDS, geocodificarDireccion, coordenadasADireccion, estaDentroDeColombia,
} from '../utils/colombia';
import { leerUbicacion, guardarUbicacion, distanciaKm, textoDistancia } from '../utils/ubicacion';
import { formatearDinero, iniciales, TIPO_TARIFA } from '../utils/solicitudes';
import { logError } from '../utils/log';
import './Buscar.css';

const colombiaBounds = L.latLngBounds(COLOMBIA_BOUNDS[0], COLOMBIA_BOUNDS[1]);
const RADIOS = [3, 5, 10, 15, 25];
const RADIO_POR_DEFECTO = 10;

const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Marcadores propios (sin imágenes externas): un punto para el cliente y un círculo con iniciales por profesional.
const iconoUsuario = L.divIcon({ className: 'bs-pin-usuario', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 11] });
const iconoProveedor = (texto, activo) => L.divIcon({
  className: `bs-pin${activo ? ' is-activo' : ''}`,
  html: `<span>${escapar(texto)}</span>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

// Ajusta la vista del mapa: al punto del cliente con su radio y a los profesionales que se muestran.
function AjustarVista({ ubicacion, radio, puntos }) {
  const map = useMap();
  useEffect(() => {
    const coords = puntos.map((p) => [p.lat, p.lng]);
    if (ubicacion) coords.push([ubicacion.lat, ubicacion.lng]);
    if (coords.length === 0) { map.setView(COLOMBIA_CENTER, COLOMBIA_ZOOM); return; }
    if (coords.length === 1) { map.setView(coords[0], 14); return; }
    map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 15 });
  // Las coordenadas se vuelven a calcular solo cuando cambian los puntos o la ubicación.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ubicacion?.lat, ubicacion?.lng, radio, puntos.map((p) => `${p.lat},${p.lng}`).join('|')]);
  return null;
}

function Estrella({ valor }) {
  return <span className="bs-estrella"><i aria-hidden="true">★</i> {Number(valor || 0).toFixed(1)}</span>;
}

function BuscarContent() {
  const [params] = useSearchParams();
  const { usuario } = useAuth();

  const [categorias, setCategorias] = useState([]);
  const [q, setQ] = useState(params.get('q') || '');
  const [categoriaId, setCategoriaId] = useState(params.get('categoria_id') || params.get('cat') || '');
  const [servicios, setServicios] = useState([]);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'

  const [ubicacion, setUbicacion] = useState(() => leerUbicacion());
  const [direccion, setDireccion] = useState(() => leerUbicacion()?.direccion || '');
  const [radio, setRadio] = useState(RADIO_POR_DEFECTO);
  const [sugerencias, setSugerencias] = useState([]);
  const [buscandoDir, setBuscandoDir] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState('');
  const [resaltado, setResaltado] = useState(null); // proveedor_id con el cursor encima
  const debounceDir = useRef(null);

  useEffect(() => {
    api.get('/categorias').then((r) => setCategorias(Array.isArray(r.data) ? r.data : [])).catch((e) => logError(e));
  }, []);

  // ── Servicios (filtra el servidor por palabra y categoría) ──
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      const p = new URLSearchParams({ disponible: '1' });
      if (q.trim()) p.append('q', q.trim());
      if (categoriaId) p.append('categoria_id', categoriaId);
      setEstado((e) => (e === 'listo' ? e : 'cargando'));
      api.get(`/servicios/buscar?${p}`, { signal: ctrl.signal })
        .then((r) => { setServicios(Array.isArray(r.data) ? r.data : []); setEstado('listo'); })
        .catch((e) => { if (e.name !== 'CanceledError') { logError(e); setEstado('error'); } });
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, categoriaId]);

  // ── Ubicación ──
  const fijarUbicacion = useCallback((lat, lng, texto) => {
    const u = { lat, lng, direccion: texto };
    setUbicacion(u);
    setDireccion(texto);
    setSugerencias([]);
    setAvisoUbicacion('');
    guardarUbicacion(u);
  }, []);

  const quitarUbicacion = () => {
    setUbicacion(null);
    setDireccion('');
    setSugerencias([]);
    guardarUbicacion(null);
  };

  const escribirDireccion = (valor) => {
    setDireccion(valor);
    clearTimeout(debounceDir.current);
    if (valor.trim().length < 3) { setSugerencias([]); setBuscandoDir(false); return; }
    setBuscandoDir(true);
    debounceDir.current = setTimeout(async () => {
      setSugerencias(await geocodificarDireccion(valor).catch(() => []));
      setBuscandoDir(false);
    }, 450);
  };
  useEffect(() => () => clearTimeout(debounceDir.current), []);

  const elegirSugerencia = (s) => fijarUbicacion(s.lat, s.lon, s.display_name.split(',').slice(0, 3).join(',').trim());

  // Enter en el campo: se toma la primera coincidencia.
  const confirmarDireccion = async (e) => {
    e.preventDefault();
    if (direccion.trim().length < 3) return;
    setBuscandoDir(true);
    const res = await geocodificarDireccion(direccion).catch(() => []);
    setBuscandoDir(false);
    if (res.length > 0) elegirSugerencia(res[0]);
    else setAvisoUbicacion('No encontramos esa dirección. Prueba con el barrio y la ciudad.');
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) { setAvisoUbicacion('Tu navegador no permite obtener la ubicación.'); return; }
    setLocalizando(true);
    setAvisoUbicacion('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (!estaDentroDeColombia(coords.latitude, coords.longitude)) {
          setAvisoUbicacion('Tu ubicación actual no está dentro de Colombia.');
          setLocalizando(false);
          return;
        }
        // La dirección aparece sola en el campo: no hay que escribirla.
        const texto = await coordenadasADireccion(coords.latitude, coords.longitude);
        fijarUbicacion(coords.latitude, coords.longitude, texto || 'Mi ubicación actual');
        setLocalizando(false);
      },
      (err) => {
        setAvisoUbicacion(
          err.code === 1
            ? 'El navegador no tiene permiso para usar tu ubicación. Permítelo en el candado junto a la dirección de la página, o escribe tu dirección.'
            : 'No pudimos obtener tu ubicación. Escribe tu dirección.'
        );
        setLocalizando(false);
      },
      { timeout: 10000 }
    );
  };

  // ── Resultados: con ubicación se calcula la distancia, se filtra por radio y se ordena por cercanía ──
  const conDistancia = useMemo(() => servicios.map((s) => {
    const lat = Number(s.latitud);
    const lng = Number(s.longitud);
    const tieneCoords = s.latitud != null && s.longitud != null && Number.isFinite(lat) && Number.isFinite(lng);
    return { ...s, lat, lng, tieneCoords, km: ubicacion && tieneCoords ? distanciaKm(ubicacion.lat, ubicacion.lng, lat, lng) : null };
  }), [servicios, ubicacion]);

  const resultados = useMemo(() => {
    if (!ubicacion) return conDistancia;
    return conDistancia
      .filter((s) => s.km !== null && s.km <= radio)
      .sort((a, b) => a.km - b.km);
  }, [conDistancia, ubicacion, radio]);

  const fueraDelRadio = ubicacion ? conDistancia.length - resultados.length : 0;

  // Un marcador por profesional (puede tener varios servicios): se muestra el más cercano de la lista.
  const marcadores = useMemo(() => {
    const porProveedor = new Map();
    for (const s of resultados) {
      if (!s.tieneCoords) continue;
      const actual = porProveedor.get(s.proveedor_id);
      if (actual) actual.servicios.push(s);
      else porProveedor.set(s.proveedor_id, { id: s.proveedor_id, lat: s.lat, lng: s.lng, nombre: s.nombre, apellido: s.apellido, km: s.km, promedio: s.calificacion_promedio, servicios: [s] });
    }
    return [...porProveedor.values()];
  }, [resultados]);

  const categoriaActual = categorias.find((c) => String(c.id) === String(categoriaId));
  const textoResumen = estado !== 'listo' ? '' : ubicacion
    ? `${resultados.length} ${resultados.length === 1 ? 'profesional' : 'profesionales'} a menos de ${radio} km`
    : `${resultados.length} ${resultados.length === 1 ? 'servicio' : 'servicios'}`;

  return (
    <div className="bs">
      {/* Qué busca */}
      <div className="bs-barra">
        <label className="bs-buscador">
          <span className="bs-solo-lectores">Buscar un servicio</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="¿Qué necesitas? Ej: fuga en el baño, instalar un tomacorriente" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Borrar búsqueda">×</button>}
        </label>
      </div>

      <div className="bs-categorias" role="group" aria-label="Categoría">
        <button type="button" className={`bs-chip${categoriaId === '' ? ' is-on' : ''}`} aria-pressed={categoriaId === ''} onClick={() => setCategoriaId('')}>Todas</button>
        {categorias.map((c) => (
          <button key={c.id} type="button" className={`bs-chip${String(c.id) === String(categoriaId) ? ' is-on' : ''}`} aria-pressed={String(c.id) === String(categoriaId)} onClick={() => setCategoriaId(String(c.id))}>
            {c.nombre}
          </button>
        ))}
      </div>

      {/* Dónde está */}
      <form className="bs-ubicacion" onSubmit={confirmarDireccion}>
        <div className="bs-dir">
          <label htmlFor="bs-direccion">Tu ubicación</label>
          <div className="bs-dir-campo">
            <input
              id="bs-direccion"
              value={direccion}
              onChange={(e) => escribirDireccion(e.target.value)}
              onBlur={() => setTimeout(() => setSugerencias([]), 200)}
              placeholder="Escribe tu dirección o usa tu ubicación"
              autoComplete="off"
            />
            {direccion && <button type="button" className="bs-dir-borrar" onClick={quitarUbicacion} aria-label="Quitar ubicación">×</button>}
            {(sugerencias.length > 0 || buscandoDir) && (
              <ul className="bs-sugerencias">
                {buscandoDir && sugerencias.length === 0 && <li className="bs-sug-info">Buscando direcciones...</li>}
                {sugerencias.map((s, i) => (
                  <li key={i}><button type="button" onMouseDown={(e) => { e.preventDefault(); elegirSugerencia(s); }}>{s.display_name}</button></li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <button type="button" className="bs-btn" onClick={usarMiUbicacion} disabled={localizando}>
          {localizando ? 'Buscando...' : 'Usar mi ubicación'}
        </button>
        <label className="bs-radio">
          <span>Distancia</span>
          <select value={radio} onChange={(e) => setRadio(Number(e.target.value))} disabled={!ubicacion}>
            {RADIOS.map((r) => <option key={r} value={r}>Hasta {r} km</option>)}
          </select>
        </label>
      </form>
      {avisoUbicacion && <p className="bs-aviso" role="alert">{avisoUbicacion}</p>}

      <div className="bs-cuerpo">
        {/* Lista */}
        <section className="bs-lista" aria-label="Resultados">
          <div className="bs-resumen" aria-live="polite">
            <b>{textoResumen}</b>
            {categoriaActual && <span> · {categoriaActual.nombre}</span>}
            {!ubicacion && estado === 'listo' && <p>Agrega tu ubicación para ver quién está más cerca.</p>}
          </div>

          {estado === 'cargando' && <div className="bs-vacio">Buscando servicios...</div>}
          {estado === 'error' && <div className="bs-vacio" role="alert">No se pudieron cargar los servicios. Intenta de nuevo.</div>}

          {estado === 'listo' && resultados.length === 0 && (
            <div className="bs-vacio">
              <b>{ubicacion && fueraDelRadio > 0 ? `No hay profesionales a menos de ${radio} km` : 'No encontramos servicios'}</b>
              <p>
                {ubicacion && fueraDelRadio > 0
                  ? `Hay ${fueraDelRadio} más lejos. Prueba con una distancia mayor.`
                  : 'Prueba con otras palabras o con otra categoría.'}
              </p>
              {ubicacion && fueraDelRadio > 0 && radio < RADIOS[RADIOS.length - 1] && (
                <button type="button" className="bs-btn" onClick={() => setRadio(RADIOS.find((r) => r > radio))}>Ampliar a {RADIOS.find((r) => r > radio)} km</button>
              )}
            </div>
          )}

          {estado === 'listo' && resultados.map((s) => (
            <Link
              key={s.id}
              to={`/servicio/${s.id}`}
              className={`bs-tarjeta${resaltado === s.proveedor_id ? ' is-resaltada' : ''}`}
              onMouseEnter={() => setResaltado(s.proveedor_id)}
              onMouseLeave={() => setResaltado(null)}
              onFocus={() => setResaltado(s.proveedor_id)}
              onBlur={() => setResaltado(null)}
            >
              <div className="bs-avatar" aria-hidden="true">{iniciales(s.nombre, s.apellido)}</div>
              <div className="bs-tarjeta-info">
                <h3>{s.titulo}</h3>
                <p className="bs-quien">{s.nombre} {s.apellido}{Boolean(s.verificado) && <span className="bs-verificado" title="Identidad y oficio verificados por Urbify">✓ Verificado</span>} · {s.categoria_nombre}</p>
                <p className="bs-meta">
                  <Estrella valor={s.calificacion_promedio} />
                  <span>({s.total_calificaciones})</span>
                  {s.km !== null && <span className="bs-distancia">{textoDistancia(s.km)}</span>}
                </p>
              </div>
              <div className="bs-precio">
                <b>{formatearDinero(s.tarifa)}</b>
                {TIPO_TARIFA[s.tipo_tarifa] && <small>{TIPO_TARIFA[s.tipo_tarifa]}</small>}
              </div>
            </Link>
          ))}
          {!usuario && estado === 'listo' && resultados.length > 0 && <p className="bs-nota">Inicia sesión para ver el contacto y pedir una cita.</p>}
        </section>

        {/* Mapa */}
        <div className="bs-mapa" aria-label="Mapa de profesionales">
          <MapContainer center={COLOMBIA_CENTER} zoom={COLOMBIA_ZOOM} minZoom={5} maxBounds={colombiaBounds} maxBoundsViscosity={1} style={{ width: '100%', height: '100%' }}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <AjustarVista ubicacion={ubicacion} radio={radio} puntos={marcadores} />
            {ubicacion && (
              <>
                <Marker position={[ubicacion.lat, ubicacion.lng]} icon={iconoUsuario}><Popup><b>Tú estás aquí</b></Popup></Marker>
                <Circle center={[ubicacion.lat, ubicacion.lng]} radius={radio * 1000} pathOptions={{ color: 'oklch(0.40 0.18 255)', fillColor: 'oklch(0.40 0.18 255)', fillOpacity: 0.06, weight: 1.5, dashArray: '6 4' }} />
              </>
            )}
            {marcadores.map((m) => (
              <Marker
                key={m.id}
                position={[m.lat, m.lng]}
                icon={iconoProveedor(iniciales(m.nombre, m.apellido), resaltado === m.id)}
                zIndexOffset={resaltado === m.id ? 1000 : 0}
                eventHandlers={{ mouseover: () => setResaltado(m.id), mouseout: () => setResaltado(null) }}
              >
                <Popup>
                  <div className="bs-popup">
                    <b>{m.nombre} {m.apellido}</b>
                    <span>★ {Number(m.promedio || 0).toFixed(1)}{m.km !== null ? ` · ${textoDistancia(m.km)}` : ''}</span>
                    {m.servicios.map((s) => <Link key={s.id} to={`/servicio/${s.id}`}>{s.titulo}</Link>)}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          {!ubicacion && (
            <div className="bs-mapa-pista">Agrega tu ubicación y verás aquí qué tan cerca está cada profesional.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Buscar() {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;

  if (usuario) {
    return (
      <DashboardLayout titulo="Buscar Servicios" subtitulo="Encuentra profesionales cerca de ti">
        <BuscarContent />
      </DashboardLayout>
    );
  }

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
        <h1 className="bs-solo-lectores">Buscar servicios</h1>
        <BuscarContent />
      </div>
    </div>
  );
}
