import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import { Star, Send, ArrowLeft } from 'lucide-react';

const glassCard = {
  backgroundColor: 'rgba(255, 255, 255, 0.6)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(0, 0, 0, 0.05)',
};

const btnGradient = {
  color: 'white',
  background: 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)',
};

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
      <DashboardLayout titulo="Calificar Servicio">
        <div className="max-w-lg mx-auto mt-12 text-center rounded-xl p-8" style={glassCard}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
          }}>
            <Star size={32} style={{ color: '#4ade80', fill: '#4ade80' }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: 'oklch(0.25 0.06 240)' }}>¡Calificación enviada!</h2>
          <p className="text-sm mb-6" style={{ color: 'oklch(0.45 0.03 240)' }}>Gracias por tu feedback, ayuda a mejorar la comunidad.</p>
          <button
            onClick={() => navigate('/mis-solicitudes')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all text-sm font-semibold"
            style={btnGradient}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.45 0.18 255), oklch(0.77 0.13 200))'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)'; }}
          >
            <ArrowLeft size={16} />
            Volver a Mis Solicitudes
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout titulo="Calificar Servicio" subtitulo="Comparte tu experiencia">
      <div className="max-w-lg mx-auto">
        <div className="rounded-xl p-6 lg:p-8" style={glassCard}>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
            }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center">
              <label className="block text-sm mb-3" style={{ color: 'oklch(0.45 0.03 240)' }}>Puntuación</label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setPuntuacion(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className="p-1 transition-all"
                    style={{
                      color: (hover || puntuacion) >= star ? '#ff6b35' : 'rgba(193, 200, 193, 0.15)',
                      transform: (hover || puntuacion) >= star ? 'scale(1.1)' : 'scale(1)',
                    }}
                    aria-label={`Calificar ${star} estrella${star > 1 ? 's' : ''}`}
                  >
                    <Star size={32} fill={(hover || puntuacion) >= star ? '#ff6b35' : 'transparent'} />
                  </button>
                ))}
              </div>
              {puntuacion > 0 && (
                <p className="text-sm mt-2" style={{ color: 'oklch(0.45 0.03 240)' }}>
                  {puntuacion === 1 && 'Muy malo'}
                  {puntuacion === 2 && 'Malo'}
                  {puntuacion === 3 && 'Regular'}
                  {puntuacion === 4 && 'Bueno'}
                  {puntuacion === 5 && 'Excelente'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'oklch(0.45 0.03 240)' }}>Comentario (opcional)</label>
              <textarea
                rows="4"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Cuenta tu experiencia con este servicio..."
                className="w-full px-4 py-2.5 rounded-lg transition-colors resize-none"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  color: 'oklch(0.25 0.06 240)',
                  outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.2)'; }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 0, 0, 0.05)'; }}
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-all disabled:opacity-50 text-sm font-semibold"
              style={btnGradient}
              onMouseEnter={(e) => { if (!enviando) e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.45 0.18 255), oklch(0.77 0.13 200))'; }}
              onMouseLeave={(e) => { if (!enviando) e.currentTarget.style.background = 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)'; }}
            >
              <Send size={16} />
              {enviando ? 'Enviando...' : 'Enviar Calificación'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
