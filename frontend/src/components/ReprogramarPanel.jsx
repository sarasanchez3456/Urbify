import { useState } from 'react';
import api from '../api/axios';
import SelectorHorario from './SelectorHorario';
import { fechaServicioLarga, horaMensaje } from '../utils/solicitudes';
import { logError } from '../utils/log';

// Elegir otra fecha para una cita usando las horas REALES del profesional. Al confirmar, el servidor vuelve a
// comprobar que la hora siga libre (si otro cliente la tomó antes, avisa y se recarga la agenda).
export default function ReprogramarPanel({ solicitud, onVolver, onCerrar, onEnviada }) {
  const [elegida, setElegida] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const enviar = async () => {
    if (!elegida || enviando) return;
    setEnviando(true);
    setError('');
    try {
      await api.post(`/solicitudes/${solicitud.id}/reprogramaciones`, { fecha_propuesta: elegida });
      window.dispatchEvent(new Event('notificacion_actualizada'));
      onEnviada();
    } catch (err) {
      logError('Error al pedir el cambio de fecha:', err);
      setError(err.response?.data?.error || 'No se pudo enviar el pedido. Intenta de nuevo.');
      // Si la hora ya no está libre se refresca la agenda para que se vea ocupada.
      if (err.response?.status === 409) {
        setElegida('');
        setRecarga((n) => n + 1);
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <div className="sp-chat-cabecera">
        <button type="button" className="sp-volver" onClick={onVolver} aria-label="Volver al detalle" data-autofocus>←</button>
        <div className="sp-chat-quien">
          <b>Reprogramar cita</b>
          <small>{solicitud.servicio_titulo}</small>
        </div>
        <button type="button" className="pl-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
      </div>

      <div className="pl-cuerpo">
        <p className="sp-sub">
          Estas son las horas reales de {solicitud.proveedor_nombre || 'el profesional'}. Las que aparecen tachadas ya están tomadas o fuera de su horario.
        </p>
        {solicitud.fecha_servicio && (
          <div className="sp-franja sp-rp-actual"><b>Cita actual:</b> {fechaServicioLarga(solicitud.fecha_servicio)}</div>
        )}
        {error && <div className="pl-aviso pl-aviso--error" role="alert">{error}</div>}
        <SelectorHorario proveedorId={solicitud.proveedor_id} solicitudId={solicitud.id} valor={elegida} onElegir={setElegida} recarga={recarga} />
      </div>

      <div className="pl-pie sp-pie-columna">
        <button type="button" className="pl-boton pl-boton--principal" onClick={enviar} disabled={!elegida || enviando}>
          {enviando ? 'Enviando...' : elegida ? `Pedir cambio a ${horaMensaje(elegida)}` : 'Elige una hora'}
        </button>
        <p className="sp-ayuda">Tu cita sigue igual hasta que el profesional acepte. Mientras tanto, esa hora queda reservada para ti.</p>
      </div>
    </>
  );
}
