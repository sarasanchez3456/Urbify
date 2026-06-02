import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import { Search, MapPin, Star } from 'lucide-react';
import './Buscar.css';

function BuscarContent({ dashboard }) {
  const [searchParams] = useSearchParams();
  const [categorias, setCategorias] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({
    q: '',
    categoria_id: searchParams.get('categoria_id') || '',
  });
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    api.get('/categorias').then((res) => setCategorias(res.data)).catch((err) => console.error('Error al cargar categorías:', err));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (filtros.q) params.append('q', filtros.q);
      if (filtros.categoria_id) params.append('categoria_id', filtros.categoria_id);
      params.append('disponible', '1');

      const controller = new AbortController();
      abortRef.current = controller;

      setCargando(true);
      api.get(`/servicios/buscar?${params}`, { signal: controller.signal })
        .then((res) => setServicios(res.data))
        .catch((err) => {
          if (err.name !== 'CanceledError') console.error('Error al buscar servicios:', err);
        })
        .finally(() => setCargando(false));
    }, 300);
    return () => {
      clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [filtros]);

  if (dashboard) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-on-surface" style={{ fontFamily: "'Playfair Display', serif" }}>Buscar Servicios</h1>
          <p className="text-sm text-on-surface-variant mt-1">Encuentra al profesional que necesitas</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                placeholder="Buscar por palabra clave..."
                value={filtros.q}
                onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 transition-colors text-sm"
              />
            </div>
            <select
              value={filtros.categoria_id}
              onChange={(e) => setFiltros({ ...filtros, categoria_id: e.target.value })}
              className="px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface focus:outline-none focus:border-primary/50 transition-colors text-sm min-w-[180px]"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {cargando ? (
          <div className="text-center py-16 text-on-surface-variant">Buscando servicios...</div>
        ) : servicios.length === 0 ? (
          <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant/30 rounded-xl">
            <Search size={48} className="mx-auto mb-4 text-on-surface-variant/30" />
            <h3 className="text-lg font-semibold text-on-surface mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>No se encontraron servicios</h3>
            <p className="text-sm text-on-surface-variant">Intenta con otros términos de búsqueda o categorías</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servicios.map((servicio) => (
              <Link
                key={servicio.id}
                to={`/servicio/${servicio.id}`}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 hover:border-primary/30 transition-all hover:-translate-y-0.5 block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                      {servicio.nombre?.[0]}{servicio.apellido?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">{servicio.nombre} {servicio.apellido}</p>
                      <p className="text-xs text-on-surface-variant">{servicio.categoria_nombre}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm shrink-0">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="text-on-surface font-medium">{parseFloat(servicio.calificacion_promedio || 0).toFixed(1)}</span>
                    <span className="text-on-surface-variant text-xs">({servicio.total_calificaciones})</span>
                  </div>
                </div>
                <h3 className="text-base font-semibold text-on-surface mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{servicio.titulo}</h3>
                <p className="text-sm text-on-surface-variant mb-4 line-clamp-2">{servicio.descripcion}</p>
                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                  <span className="text-base font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
                    ${parseFloat(servicio.tarifa || 0).toFixed(2)} <span className="text-xs text-on-surface-variant">/{servicio.tipo_tarifa}</span>
                  </span>
                  {servicio.direccion && (
                    <span className="text-xs text-on-surface-variant flex items-center gap-1">
                      <MapPin size={12} />
                      {servicio.direccion}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="buscar-page">
      <div className="container page-header">
        <h1>Buscar Servicios</h1>
        <p>Encuentra al profesional que necesitas</p>
      </div>

      <div className="container">
        <div className="filtros card">
          <div className="filtros-grid">
            <div className="form-group">
              <input
                placeholder="Buscar por palabra clave..."
                value={filtros.q}
                onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
              />
            </div>
            <div className="form-group">
              <select
                value={filtros.categoria_id}
                onChange={(e) => setFiltros({ ...filtros, categoria_id: e.target.value })}
              >
                <option value="">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="loading">Buscando servicios...</div>
        ) : servicios.length === 0 ? (
          <div className="sin-resultados">
            <h3>No se encontraron servicios</h3>
            <p>Intenta con otros términos de búsqueda o categorías</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {servicios.map((servicio) => (
              <Link
                key={servicio.id}
                to={`/servicio/${servicio.id}`}
                className="servicio-card"
              >
                <div className="servicio-header">
                  <div className="servicio-proveedor">
                    <div className="servicio-avatar">
                      {servicio.nombre?.[0]}{servicio.apellido?.[0]}
                    </div>
                    <div>
                      <p className="servicio-nombre">
                        {servicio.nombre} {servicio.apellido}
                      </p>
                      <p className="servicio-categoria">{servicio.categoria_nombre}</p>
                    </div>
                  </div>
                  <div className="servicio-rating">
                    <span>★</span>
                    <span>{parseFloat(servicio.calificacion_promedio || 0).toFixed(1)}</span>
                    <span className="servicio-total-cal">({servicio.total_calificaciones})</span>
                  </div>
                </div>
                <h3 className="servicio-titulo">{servicio.titulo}</h3>
                <p className="servicio-descripcion">
                  {servicio.descripcion?.substring(0, 120)}...
                </p>
                <div className="servicio-footer">
                  <span className="servicio-precio">
                    ${parseFloat(servicio.tarifa || 0).toFixed(2)} / {servicio.tipo_tarifa}
                  </span>
                  {servicio.direccion && (
                    <span className="servicio-ubicacion">📍 {servicio.direccion}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Buscar() {
  const { usuario } = useAuth();

  if (usuario) {
    return (
      <DashboardLayout titulo="Buscar Servicios" subtitulo="Encuentra al profesional que necesitas">
        <BuscarContent dashboard />
      </DashboardLayout>
    );
  }

  return <BuscarContent />;
}
