import { useState } from 'react';
import api from '../api/axios';
import { logError } from '../utils/log';

const NOTAS = ['', 'Mala experiencia', 'Regular', 'Bien', 'Muy bien', 'Excelente'];

// El profesional califica al cliente de una solicitud completada. Solo lo ven otros profesionales.
export default function CalificarClientePanel({ solicitud, onVolver, onCerrar, onEnviada }) {
  const [puntos, setPuntos] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const enviar = async (e) => {
    e.preventDefault();
    if (!puntos || enviando) return;
    setEnviando(true);
    setError('');
    try {
      await api.post('/calificaciones/cliente', { solicitud_id: solicitud.id, puntuacion: puntos, comentario: comentario.trim() || undefined });
      onEnviada(false);
    } catch (err) {
      logError('Error al calificar al cliente:', err);
      setError(err.response?.data?.error || 'No se pudo enviar la calificación. Intenta de nuevo.');
      if (err.response?.status === 409) onEnviada(true);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="sp-form" onSubmit={enviar} noValidate>
      <div className="sp-chat-cabecera">
        <button type="button" className="sp-volver" onClick={onVolver} aria-label="Volver al detalle" data-autofocus>←</button>
        <div className="sp-chat-quien">
          <b>Calificar al cliente</b>
          <small>{solicitud.cliente_nombre} {solicitud.cliente_apellido} · {solicitud.servicio_titulo}</small>
        </div>
        <button type="button" className="pl-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
      </div>

      <div className="pl-cuerpo">
        <p className="sp-sub">Tu calificación ayuda a otros profesionales a saber cómo es el cliente. El cliente no la ve.</p>
        <div>
          <span className="sp-etiqueta" id="cc-puntos">¿Cómo fue trabajar con {solicitud.cliente_nombre}?</span>
          <div className="sp-estrellas" role="radiogroup" aria-labelledby="cc-puntos">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={puntos === n} aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`} className={`sp-estrella${n <= puntos ? ' is-on' : ''}`} onClick={() => setPuntos(n)}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3.5 2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7L12 3.5Z" /></svg>
              </button>
            ))}
          </div>
          <p className="sp-texto-nota" aria-live="polite">{NOTAS[puntos]}</p>
        </div>
        <div>
          <label className="sp-etiqueta" htmlFor="cc-comentario">Comentario <span className="sp-opcional">(opcional)</span></label>
          <textarea id="cc-comentario" className="sp-textarea" maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Puntualidad, trato, acceso al lugar..." />
        </div>
        {error && <div className="pl-aviso pl-aviso--error" role="alert">{error}</div>}
      </div>

      <div className="pl-pie sp-pie-columna">
        <button type="submit" className="pl-boton pl-boton--principal" disabled={!puntos || enviando}>{enviando ? 'Enviando...' : 'Enviar calificación'}</button>
      </div>
    </form>
  );
}
