import { useState } from 'react';
import api from '../api/axios';
import { MOTIVOS_REPORTE } from '../utils/solicitudes';
import { logError } from '../utils/log';

// El cliente cuenta a la administración un problema con el profesional de una solicitud suya.
export default function ReportarPanel({ solicitud, onVolver, onCerrar, onEnviado }) {
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const valido = motivo && detalle.trim().length >= 10;

  const enviar = async (e) => {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setError('');
    try {
      await api.post('/reportes', { solicitud_id: solicitud.id, motivo, detalle: detalle.trim() });
      onEnviado();
    } catch (err) {
      logError('Error al enviar el reporte:', err);
      setError(err.response?.data?.error || 'No se pudo enviar el reporte. Intenta de nuevo.');
      if (err.response?.status === 409) onEnviado(true); // ya estaba reportada: se actualiza la lista
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="sp-form" onSubmit={enviar} noValidate>
      <div className="sp-chat-cabecera">
        <button type="button" className="sp-volver" onClick={onVolver} aria-label="Volver al detalle" data-autofocus>←</button>
        <div className="sp-chat-quien">
          <b>Reportar un problema</b>
          <small>{solicitud.servicio_titulo} · {solicitud.proveedor_nombre} {solicitud.proveedor_apellido}</small>
        </div>
        <button type="button" className="pl-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
      </div>

      <div className="pl-cuerpo">
        <p className="sp-sub">Tu reporte lo revisa la administración de Urbify. El profesional no ve lo que escribas aquí.</p>

        <fieldset className="sp-campo-grupo">
          <legend className="sp-etiqueta">¿Qué pasó?</legend>
          <div className="sp-chips">
            {MOTIVOS_REPORTE.map(([valor, texto]) => (
              <button key={valor} type="button" className={`sp-chip${motivo === valor ? ' is-on' : ''}`} aria-pressed={motivo === valor} onClick={() => setMotivo(valor)}>{texto}</button>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="sp-etiqueta" htmlFor="reporte-detalle">Cuéntanos con detalle <span className="sp-opcional">(mínimo 10 letras)</span></label>
          <textarea id="reporte-detalle" className="sp-textarea" maxLength={1000} value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Qué ocurrió, cuándo y cómo te afectó." />
        </div>

        {error && <div className="pl-aviso pl-aviso--error" role="alert">{error}</div>}
      </div>

      <div className="pl-pie sp-pie-columna">
        <button type="submit" className="pl-boton pl-boton--principal" disabled={!valido || enviando}>{enviando ? 'Enviando...' : 'Enviar reporte'}</button>
      </div>
    </form>
  );
}
