import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './Auth.css';
import './Solicitar.css';

export default function SolicitarServicio() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [servicio, setServicio] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  useEffect(() => {
    api.get(`/servicios/${id}`)
      .then((res) => setServicio(res.data))
      .catch(() => navigate('/buscar'))
      .finally(() => setCargando(false));
  }, [id, navigate]);

  if (!usuario || usuario.rol !== 'cliente') {
    navigate('/login');
    return null;
  }

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
      });
      setExito(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar solicitud');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <div className="loading container">Cargando...</div>;
  if (exito) {
    return (
      <div className="auth-page container">
        <div className="auth-card card">
          <div className="alert alert-success">
            <h2>¡Solicitud enviada con éxito!</h2>
            <p>El proveedor recibirá una notificación por correo electrónico y se pondrá en contacto contigo pronto.</p>
          </div>
          <button onClick={() => navigate('/buscar')} className="btn btn-primary btn-block">
            Volver a Buscar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page container">
      <div className="auth-card card">
        <h1>Solicitar Servicio</h1>
        <div className="solicitar-resumen">
          <p><strong>Servicio:</strong> {servicio?.titulo}</p>
          <p><strong>Proveedor:</strong> {servicio?.nombre} {servicio?.apellido}</p>
          <p><strong>Tarifa:</strong> ${parseFloat(servicio?.tarifa || 0).toFixed(2)} / {servicio?.tipo_tarifa}</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Describe tu problema o necesidad</label>
            <textarea
              rows="5"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe qué necesitas, la dirección exacta, y cualquier detalle relevante..."
              required
            />
          </div>
          <div className="form-group">
            <label>Fecha preferida (opcional)</label>
            <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
            {enviando ? 'Enviando solicitud...' : 'Enviar Solicitud'}
          </button>
        </form>
      </div>
    </div>
  );
}
