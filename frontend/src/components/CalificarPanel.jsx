import { useState } from 'react';
import api from '../api/axios';
import PanelLateral from './PanelLateral';
import { iniciales, MOTIVOS_POSITIVOS, MOTIVOS_NEGATIVOS } from '../utils/solicitudes';
import { logError } from '../utils/log';
import './SolicitudPaneles.css';

const TEXTOS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

function Estrella({ llena }) {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" fill={llena ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="m12 3.5 2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7L12 3.5Z" />
    </svg>
  );
}

// Califica una solicitud completada sin salir de la lista. Usa POST /calificaciones (solo el cliente de la
// solicitud, una sola vez: si ya estaba calificada el servidor responde 409).
export default function CalificarPanel({ solicitud, onCerrar, onCalificada, onYaCalificada }) {
  const [puntuacion, setPuntuacion] = useState(0);
  const [hover, setHover] = useState(0);
  const [motivos, setMotivos] = useState([]);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const visible = hover || puntuacion;
  const proveedor = `${solicitud.proveedor_nombre || ''} ${solicitud.proveedor_apellido || ''}`.trim();
  const positiva = puntuacion >= 4;
  const opcionesMotivos = positiva ? MOTIVOS_POSITIVOS : MOTIVOS_NEGATIVOS;

  // Al cambiar entre una nota positiva (4-5) y una negativa (1-3) los motivos elegidos ya no corresponden.
  const elegirPuntuacion = (n) => {
    if ((n >= 4) !== (puntuacion >= 4)) setMotivos([]);
    setPuntuacion(n);
  };

  const alternarMotivo = (codigo) => {
    setMotivos((actuales) => (actuales.includes(codigo) ? actuales.filter((m) => m !== codigo) : [...actuales, codigo]));
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (puntuacion === 0 || enviando) return;
    setEnviando(true);
    setError('');
    try {
      const texto = comentario.trim();
      await api.post('/calificaciones', {
        solicitud_id: solicitud.id,
        puntuacion,
        ...(texto ? { comentario: texto } : {}),
        ...(motivos.length > 0 ? { motivos } : {}),
      });
      onCalificada(puntuacion);
    } catch (err) {
      if (err.response?.status === 409) {
        onYaCalificada();
        return;
      }
      logError('Error al enviar la calificación:', err);
      setError(err.response?.data?.error || 'No se pudo enviar tu calificación. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PanelLateral onCerrar={onCerrar} etiqueta="Calificar servicio" ancho={440}>
      <form className="sp-form" onSubmit={enviar}>
        <div className="pl-cabecera">
          <div className="pl-cabecera-fila">
            <h2 className="pl-titulo">Califica este servicio</h2>
            <button type="button" className="pl-cerrar" onClick={onCerrar} aria-label="Cerrar" data-autofocus>×</button>
          </div>
          <p className="sp-sub">Tu opinión ayuda a otros vecinos.</p>
        </div>

        <div className="pl-cuerpo">
          <div className="sp-contexto">
            <div className="sp-avatar" aria-hidden="true">{iniciales(solicitud.proveedor_nombre, solicitud.proveedor_apellido)}</div>
            <div>
              <b>{solicitud.servicio_titulo}</b>
              <span>{proveedor}</span>
            </div>
          </div>

          <div>
            <p className="sp-etiqueta" id="cal-etiqueta">¿Cómo fue el trabajo?</p>
            <div className="sp-estrellas" role="radiogroup" aria-labelledby="cal-etiqueta" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={puntuacion === n}
                  aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}: ${TEXTOS[n]}`}
                  className={`sp-estrella${visible >= n ? ' is-on' : ''}`}
                  onMouseEnter={() => setHover(n)}
                  onFocus={() => setHover(n)}
                  onBlur={() => setHover(0)}
                  onClick={() => elegirPuntuacion(n)}
                >
                  <Estrella llena={visible >= n} />
                </button>
              ))}
            </div>
            <p className="sp-texto-nota" aria-live="polite">{TEXTOS[visible]}</p>
          </div>

          {puntuacion > 0 && (
            <div>
              <p className="sp-etiqueta" id="cal-motivos">
                {positiva ? '¿Qué te gustó?' : '¿Qué salió mal?'} <span className="sp-opcional">(opcional)</span>
              </p>
              <div className="sp-chips" role="group" aria-labelledby="cal-motivos">
                {opcionesMotivos.map(([codigo, etiqueta]) => (
                  <button
                    key={codigo}
                    type="button"
                    className={`sp-chip${motivos.includes(codigo) ? ' is-on' : ''}`}
                    aria-pressed={motivos.includes(codigo)}
                    onClick={() => alternarMotivo(codigo)}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="sp-etiqueta" htmlFor="cal-comentario">
              Comentario <span className="sp-opcional">(opcional)</span>
            </label>
            <textarea
              id="cal-comentario"
              className="sp-textarea"
              maxLength={1000}
              placeholder="¿Qué le dirías a otro vecino que piensa contratarlo?"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </div>

          {error && <div className="pl-aviso pl-aviso--error" role="alert">{error}</div>}
        </div>

        <div className="pl-pie sp-pie-columna">
          <button type="submit" className="pl-boton pl-boton--principal" disabled={puntuacion === 0 || enviando}>
            {enviando ? 'Enviando...' : 'Enviar calificación'}
          </button>
          <p className="sp-ayuda">{puntuacion === 0 ? 'Elige una puntuación para continuar' : 'Ya puedes enviarla'}</p>
        </div>
      </form>
    </PanelLateral>
  );
}
