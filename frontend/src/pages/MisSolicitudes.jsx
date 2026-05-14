import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './Buscar.css';

export default function MisSolicitudes() {
  const { usuario } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const endpoint = usuario?.rol === 'cliente' ? '/solicitudes/cliente' : '/solicitudes/proveedor';
    api.get(endpoint)
      .then((res) => setSolicitudes(res.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [usuario]);

  const cambiarEstado = async (id, estado) => {
    try {
      await api.put(`/solicitudes/${id}/estado`, { estado });
      const endpoint = usuario?.rol === 'cliente' ? '/solicitudes/cliente' : '/solicitudes/proveedor';
      const res = await api.get(endpoint);
      setSolicitudes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const estadoColor = {
    pendiente: '#f59e0b',
    aceptada: '#4361ee',
    en_proceso: '#8b5cf6',
    completada: '#16a34a',
    cancelada: '#ef4444',
  };

  if (cargando) return <div className="loading container">Cargando...</div>;

  return (
    <div className="buscar-page container">
      <div className="page-header">
        <h1>Mis Solicitudes</h1>
        <p>{usuario?.rol === 'cliente' ? 'Solicitudes que has realizado' : 'Solicitudes que has recibido'}</p>
      </div>

      {solicitudes.length === 0 ? (
        <div className="sin-resultados">
          <h3>No hay solicitudes</h3>
          <p>{usuario?.rol === 'cliente' ? 'Busca servicios y solicita un profesional' : 'Aún no has recibido solicitudes'}</p>
          {usuario?.rol === 'cliente' && <Link to="/buscar" className="btn btn-primary" style={{ marginTop: '1rem' }}>Buscar Servicios</Link>}
        </div>
      ) : (
        <div className="grid grid-2">
          {solicitudes.map((sol) => (
            <div key={sol.id} className="card">
              <div className="solicitud-header">
                <h3>{sol.servicio_titulo}</h3>
                <span className="solicitud-estado" style={{ background: estadoColor[sol.estado] }}>
                  {sol.estado}
                </span>
              </div>
              <p className="solicitud-cliente">
                {usuario?.rol === 'cliente'
                  ? `Proveedor: ${sol.proveedor_nombre} ${sol.proveedor_apellido}`
                  : `Cliente: ${sol.cliente_nombre} ${sol.cliente_apellido}`
                }
              </p>
              {sol.descripcion && <p className="servicio-descripcion">{sol.descripcion}</p>}
              <div className="solicitud-detalles">
                <span>📅 {new Date(sol.fecha_solicitud).toLocaleDateString()}</span>
                <span>💰 ${parseFloat(sol.tarifa).toFixed(2)}</span>
              </div>
              {usuario?.rol === 'proveedor' && sol.estado === 'pendiente' && (
                <div className="solicitud-acciones" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => cambiarEstado(sol.id, 'aceptada')} className="btn btn-primary btn-sm">Aceptar</button>
                  <button onClick={() => cambiarEstado(sol.id, 'cancelada')} className="btn btn-danger btn-sm">Rechazar</button>
                </div>
              )}
              {usuario?.rol === 'proveedor' && sol.estado === 'aceptada' && (
                <div className="solicitud-acciones" style={{ marginTop: '1rem' }}>
                  <button onClick={() => cambiarEstado(sol.id, 'en_proceso')} className="btn btn-primary btn-sm">Iniciar Servicio</button>
                </div>
              )}
              {usuario?.rol === 'proveedor' && sol.estado === 'en_proceso' && (
                <div className="solicitud-acciones" style={{ marginTop: '1rem' }}>
                  <button onClick={() => cambiarEstado(sol.id, 'completada')} className="btn btn-primary btn-sm">Marcar Completada</button>
                </div>
              )}
              {usuario?.rol === 'cliente' && sol.estado === 'completada' && (
                <div className="solicitud-acciones" style={{ marginTop: '1rem' }}>
                  <Link to={`/calificar/${sol.id}`} className="btn btn-primary btn-sm">Calificar Servicio</Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
