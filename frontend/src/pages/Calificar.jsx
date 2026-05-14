import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Auth.css';

export default function Calificar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [puntuacion, setPuntuacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [hover, setHover] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (puntuacion === 0) {
      setError('Selecciona una puntuación');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await api.post('/calificaciones', { solicitud_id: Number(id), puntuacion, comentario });
      setExito(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar calificación');
    } finally {
      setEnviando(false);
    }
  };

  if (exito) {
    return (
      <div className="auth-page container">
        <div className="auth-card card">
          <div className="alert alert-success">
            <h2>¡Calificación enviada!</h2>
            <p>Gracias por tu feedback, ayuda a mejorar la comunidad.</p>
          </div>
          <button onClick={() => navigate('/mis-solicitudes')} className="btn btn-primary btn-block">
            Volver a Mis Solicitudes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page container">
      <div className="auth-card card">
        <h1>Calificar Servicio</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Puntuación</label>
            <div className="estrellas-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`estrella-btn ${(hover || puntuacion) >= star ? 'activa' : ''}`}
                  onClick={() => setPuntuacion(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Comentario (opcional)</label>
            <textarea
              rows="4"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Cuenta tu experiencia con este servicio..."
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar Calificación'}
          </button>
        </form>
      </div>
    </div>
  );
}
