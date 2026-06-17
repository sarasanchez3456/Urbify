import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './ServicioDetalle.css';

export default function ServicioDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [servicio, setServicio] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get(`/servicios/${id}`)
      .then((res) => setServicio(res.data))
      .catch((err) => console.error('Error al cargar servicio:', err))
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) return <div className="loading container">Cargando servicio...</div>;
  if (!servicio) return <div className="loading container">Servicio no encontrado</div>;

  return (
    <div className="detalle-page container">
      <Link to="/buscar" className="btn-back">← Volver a resultados</Link>

      <div className="detalle-grid">
        <div className="detalle-main card">
          <div className="detalle-header">
            <span className="detalle-categoria">{servicio.categoria_nombre}</span>
            <h1>{servicio.titulo}</h1>
            <div className="detalle-rating">
              <span>★</span>
              <span>{parseFloat(servicio.calificacion_promedio || 0).toFixed(1)}</span>
              <span>({servicio.total_calificaciones} calificaciones)</span>
            </div>
          </div>

          <div className="detalle-body">
            <h3>Descripción</h3>
            <p>{servicio.descripcion}</p>

            <div className="detalle-precio-box">
              <span className="detalle-precio-label">Tarifa</span>
              <span className="detalle-precio-valor">
                ${parseFloat(servicio.tarifa || 0).toFixed(2)} / {servicio.tipo_tarifa}
              </span>
            </div>
          </div>

          <div className="detalle-comentarios">
            <h3>Calificaciones y Comentarios</h3>
            {servicio.comentarios?.length === 0 ? (
              <p className="sin-comentarios">Aún no hay calificaciones</p>
            ) : (
              servicio.comentarios?.map((c) => (
                <div key={c.id} className="comentario-item">
                  <div className="comentario-header">
                    <strong>{c.nombre} {c.apellido}</strong>
                    <span className="comentario-estrellas">
                      {'★'.repeat(c.puntuacion || 0)}{'☆'.repeat(5 - (c.puntuacion || 0))}
                    </span>
                  </div>
                  {c.comentario && <p>{c.comentario}</p>}
                  <span className="comentario-fecha">
                    {c.creado_en ? new Date(c.creado_en).toLocaleDateString() : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="detalle-sidebar">
          <div className="card">
            <div className="proveedor-info">
              <div className="proveedor-avatar-lg">
                {servicio.nombre?.[0]}{servicio.apellido?.[0]}
              </div>
              <h3>{servicio.nombre} {servicio.apellido}</h3>
              {servicio.direccion && <p className="proveedor-direccion">📍 {servicio.direccion}</p>}
              {servicio.telefono && <p className="proveedor-telefono">📞 {servicio.telefono}</p>}
            </div>

            {usuario?.rol === 'cliente' && (
              <Link to={`/solicitar/${servicio.id}`} className="btn btn-primary btn-block">
                Solicitar Servicio
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
