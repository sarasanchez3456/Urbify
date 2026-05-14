import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import './Buscar.css';

export default function Buscar() {
  const [searchParams] = useSearchParams();
  const [categorias, setCategorias] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({
    q: '',
    categoria_id: searchParams.get('categoria_id') || '',
  });

  useEffect(() => {
    api.get('/categorias').then((res) => setCategorias(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filtros.q) params.append('q', filtros.q);
    if (filtros.categoria_id) params.append('categoria_id', filtros.categoria_id);
    params.append('disponible', '1');

    setCargando(true);
    api.get(`/servicios/buscar?${params}`)
      .then((res) => setServicios(res.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [filtros]);

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
                className="servicio-card card"
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
                    <span>{parseFloat(servicio.calificacion_promedio).toFixed(1)}</span>
                    <span className="servicio-total-cal">({servicio.total_calificaciones})</span>
                  </div>
                </div>
                <h3 className="servicio-titulo">{servicio.titulo}</h3>
                <p className="servicio-descripcion">
                  {servicio.descripcion?.substring(0, 120)}...
                </p>
                <div className="servicio-footer">
                  <span className="servicio-precio">
                    ${parseFloat(servicio.tarifa).toFixed(2)} / {servicio.tipo_tarifa}
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
