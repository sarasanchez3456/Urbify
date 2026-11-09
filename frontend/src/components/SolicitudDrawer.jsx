import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import PanelLateral from './PanelLateral';
import ReprogramarPanel from './ReprogramarPanel';
import ReportarPanel from './ReportarPanel';
import {
  ETIQUETAS_ESTADO, ETIQUETA_MOTIVO, PASOS, TIPO_TARIFA_LARGO, estadoDelPaso, estaSinCalificar, formatearDinero, fechaServicioLarga,
  fechaRelativa, fechaHoraCorta, iniciales, horaMensaje, etiquetaDia, claveDia,
} from '../utils/solicitudes';
import { logError } from '../utils/log';
import './SolicitudPaneles.css';

const INTERVALO_CHAT_MS = 15000; // el servidor no avisa de mensajes nuevos: se consulta cada tanto mientras el chat está abierto

// El teléfono de la otra parte solo se muestra cuando la solicitud ya se aceptó (o siguió su camino): antes de que
// el profesional acepte no hace falta que se conozcan los datos de contacto.
const ESTADOS_CON_TELEFONO = ['aceptada', 'en_proceso', 'completada'];
// Estado que corresponde a cada paso del seguimiento (en el mismo orden que PASOS).
const ESTADO_DE_PASO = ['pendiente', 'aceptada', 'en_proceso', 'completada'];

function datosContraparte(solicitud, rol) {
  if (rol === 'cliente') {
    return {
      nombre: solicitud.proveedor_nombre || '', apellido: solicitud.proveedor_apellido || '',
      telefono: solicitud.proveedor_telefono || '', etiqueta: 'Profesional',
    };
  }
  return {
    nombre: solicitud.cliente_nombre || '', apellido: solicitud.cliente_apellido || '',
    telefono: solicitud.cliente_telefono || '', etiqueta: 'Cliente',
  };
}

function Estrellas({ n }) {
  return <span className="sp-estrellas-fijas" aria-label={`${n} de 5 estrellas`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

// ── Chat de la solicitud ─────────────────────────────────────────────────────
// Usa GET/POST /solicitudes/:id/mensajes. Solo lo ven y escriben el cliente y el proveedor de la solicitud.
function ChatSolicitud({ solicitud, rol, onVolver, onCerrar }) {
  const [mensajes, setMensajes] = useState(null); // null = cargando
  const [error, setError] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef(null);
  const contraparte = datosContraparte(solicitud, rol);
  const nombreCompleto = `${contraparte.nombre} ${contraparte.apellido}`.trim();

  // "silencioso" = consulta periódica: no muestra errores y se salta si la pestaña está oculta.
  // "forzar" = refrescar igual (por ejemplo, justo después de enviar un mensaje).
  const cargar = useCallback(async (silencioso, forzar = false) => {
    if (silencioso && !forzar && document.hidden) return;
    try {
      const res = await api.get(`/solicitudes/${solicitud.id}/mensajes`);
      setMensajes(Array.isArray(res.data) ? res.data : []);
      setError('');
    } catch (err) {
      logError('Error al cargar los mensajes:', err);
      if (!silencioso) setError(err.response?.data?.error || 'No se pudieron cargar los mensajes.');
    }
  }, [solicitud.id]);

  useEffect(() => {
    cargar(false);
    const t = setInterval(() => cargar(true), INTERVALO_CHAT_MS);
    return () => clearInterval(t);
  }, [cargar]);

  // Al abrir y cuando llega un mensaje nuevo, se baja hasta el último.
  const total = mensajes?.length ?? 0;
  useEffect(() => {
    const lista = listaRef.current;
    if (lista) lista.scrollTop = lista.scrollHeight;
  }, [total]);

  const enviar = async () => {
    const contenido = texto.trim();
    if (!contenido || enviando) return;
    setEnviando(true);
    setError('');
    try {
      await api.post(`/solicitudes/${solicitud.id}/mensajes`, { contenido });
      setTexto('');
      await cargar(true, true);
    } catch (err) {
      logError('Error al enviar el mensaje:', err);
      setError(err.response?.data?.error || 'No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const alTeclear = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      enviar();
    }
  };

  let diaAnterior = '';
  return (
    <>
      <div className="sp-chat-cabecera">
        <button type="button" className="sp-volver" onClick={onVolver} aria-label="Volver al detalle" data-autofocus>←</button>
        <div className="sp-avatar" aria-hidden="true">{iniciales(contraparte.nombre, contraparte.apellido)}</div>
        <div className="sp-chat-quien">
          <b>{nombreCompleto || contraparte.etiqueta}</b>
          <small>{contraparte.etiqueta}</small>
        </div>
        <button type="button" className="pl-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
      </div>

      <div className="sp-franja"><b>{solicitud.servicio_titulo}</b>{solicitud.fecha_servicio ? ` · Visita: ${fechaServicioLarga(solicitud.fecha_servicio)}` : ''}</div>

      <div className="sp-mensajes" ref={listaRef} role="log" aria-live="polite" aria-label="Mensajes de la solicitud">
        {mensajes === null && !error && <p className="sp-vacio">Cargando mensajes...</p>}
        {mensajes !== null && mensajes.length === 0 && <p className="sp-vacio">Aún no hay mensajes. Escribe el primero.</p>}
        {mensajes?.map((m) => {
          const dia = claveDia(m.fecha_envio);
          const separador = dia !== diaAnterior ? <span className="sp-dia" key={`d-${m.id}`}>{etiquetaDia(m.fecha_envio)}</span> : null;
          diaAnterior = dia;
          const propio = Boolean(Number(m.es_propio));
          return (
            <div key={m.id} className="sp-mensaje-fila">
              {separador}
              <div className={`sp-mensaje ${propio ? 'sp-mensaje--propio' : 'sp-mensaje--otro'}`}>
                {m.contenido}
                <time dateTime={m.fecha_envio}>{horaMensaje(m.fecha_envio)}</time>
              </div>
            </div>
          );
        })}
      </div>

      <p className="sp-nota-chat">Los mensajes quedan guardados en esta solicitud.</p>
      {error && <div className="pl-aviso pl-aviso--error sp-aviso-chat" role="alert">{error}</div>}
      <div className="sp-caja">
        <label className="sp-solo-lectores" htmlFor="chat-texto">Mensaje</label>
        <textarea
          id="chat-texto"
          className="sp-caja-texto"
          rows={1}
          maxLength={1000}
          placeholder="Escribe un mensaje…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={alTeclear}
        />
        <button type="button" className="sp-enviar" onClick={enviar} disabled={!texto.trim() || enviando} aria-label="Enviar mensaje">➤</button>
      </div>
    </>
  );
}

// ── Detalle de la solicitud ──────────────────────────────────────────────────
// Panel lateral con el seguimiento, los datos de la visita, el chat y las acciones de cada rol.
export default function SolicitudDrawer({ solicitud, rol, onCerrar, onCambiarEstado, onCalificar, onResponderCambio, onCambioPedido, onReporteEnviado }) {
  const [vista, setVista] = useState('detalle'); // 'detalle' | 'chat' | 'reprogramar'
  const [confirmando, setConfirmando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const esCliente = rol === 'cliente';
  const contraparte = datosContraparte(solicitud, rol);
  const primerNombre = contraparte.nombre.split(' ')[0] || contraparte.etiqueta.toLowerCase();
  const cancelada = solicitud.estado === 'cancelada';
  const sinCalificar = esCliente && estaSinCalificar(solicitud);
  const mostrarTelefono = Boolean(contraparte.telefono) && ESTADOS_CON_TELEFONO.includes(solicitud.estado);

  // Historial de estados: da la fecha de cada paso del seguimiento. Se vuelve a pedir cuando cambia el estado.
  const [historial, setHistorial] = useState(null);
  useEffect(() => {
    let cancelado = false;
    api.get(`/solicitudes/${solicitud.id}/historial`)
      .then((res) => { if (!cancelado) setHistorial(Array.isArray(res.data) ? res.data : []); })
      .catch((err) => logError('Error al cargar el historial de la solicitud:', err));
    return () => { cancelado = true; };
  }, [solicitud.id, solicitud.estado]);
  const fechaDelPaso = (i) => historial?.find((h) => h.estado_nuevo === ESTADO_DE_PASO[i])?.fecha || '';

  const cambiar = async (estado) => {
    if (procesando) return;
    setProcesando(true);
    await onCambiarEstado(solicitud.id, estado);
    setProcesando(false);
    setConfirmando(false);
  };

  // Cambio de fecha pedido por el cliente y todavía sin respuesta del profesional.
  const cambioPendiente = solicitud.reprogramacion_id ? { id: solicitud.reprogramacion_id, fecha: solicitud.reprogramacion_fecha } : null;
  const puedeReprogramar = esCliente && ['pendiente', 'aceptada'].includes(solicitud.estado) && !cambioPendiente;
  const responderCambio = async (accion) => {
    if (procesando) return;
    setProcesando(true);
    await onResponderCambio(solicitud, accion);
    setProcesando(false);
  };

  // El panel es el mismo en el detalle y en el chat: al cambiar de vista el foco pasa al botón principal de la
  // vista nueva (el de la anterior desaparece). La primera vez lo resuelve PanelLateral al abrirse.
  const esPrimeraVez = useRef(true);
  useEffect(() => {
    if (esPrimeraVez.current) {
      esPrimeraVez.current = false;
      return undefined;
    }
    const t = setTimeout(() => document.querySelector('.pl-panel [data-autofocus]')?.focus(), 0);
    return () => clearTimeout(t);
  }, [vista, confirmando]);

  const textoPaso = (i) => {
    const e = estadoDelPaso(solicitud.estado, i);
    if (e !== 'actual') return '';
    if (solicitud.estado === 'pendiente') return esCliente ? 'Esperando la respuesta del profesional' : 'Esperando tu respuesta';
    if (solicitud.estado === 'aceptada' && solicitud.fecha_servicio) return `Visita: ${fechaServicioLarga(solicitud.fecha_servicio)}`;
    if (solicitud.estado === 'en_proceso') return 'Trabajo en curso';
    return '';
  };

  return (
    <PanelLateral
      onCerrar={onCerrar}
      etiqueta={vista === 'chat' ? `Chat con ${primerNombre}` : vista === 'reprogramar' ? 'Reprogramar cita' : `Detalle de la solicitud ${solicitud.id}`}
      ancho={vista === 'chat' ? 460 : 480}
    >
      {vista === 'chat' ? (
        <ChatSolicitud solicitud={solicitud} rol={rol} onVolver={() => setVista('detalle')} onCerrar={onCerrar} />
      ) : vista === 'reportar' ? (
        <ReportarPanel
          solicitud={solicitud}
          onVolver={() => setVista('detalle')}
          onCerrar={onCerrar}
          onEnviado={(yaExistia) => { setVista('detalle'); onReporteEnviado(Boolean(yaExistia)); }}
        />
      ) : vista === 'reprogramar' ? (
        <ReprogramarPanel
          solicitud={solicitud}
          onVolver={() => setVista('detalle')}
          onCerrar={onCerrar}
          onEnviada={() => { setVista('detalle'); onCambioPedido(); }}
        />
      ) : (
      <>
      <div className="pl-cabecera">
        <div className="pl-cabecera-fila">
          <span className={`sp-etiqueta-estado sp-estado--${solicitud.estado}`}>{ETIQUETAS_ESTADO[solicitud.estado] || solicitud.estado}</span>
          <button type="button" className="pl-cerrar" onClick={onCerrar} aria-label="Cerrar" data-autofocus>×</button>
        </div>
        <h2 className="pl-titulo">{solicitud.servicio_titulo}</h2>
        <p className="pl-subtitulo">
          <span>{TIPO_TARIFA_LARGO[solicitud.tipo_tarifa_acordada] || 'Tarifa'}</span>
          <b>{formatearDinero(solicitud.tarifa)}</b>
        </p>
      </div>

      <div className="pl-cuerpo">
        {cambioPendiente && ['pendiente', 'aceptada'].includes(solicitud.estado) && (
          <div className="sp-cambio" role="status">
            {esCliente ? (
              <>
                <p><b>Pediste cambiar la cita al {fechaServicioLarga(cambioPendiente.fecha)}</b> · Esperando la respuesta del profesional; mientras tanto tu cita sigue en la fecha actual.</p>
                <div className="sp-cambio-acciones">
                  <button type="button" className="pl-boton pl-boton--peligro" onClick={() => responderCambio('cancelar')} disabled={procesando}>Cancelar el cambio</button>
                </div>
              </>
            ) : (
              <>
                <p><b>{primerNombre} pidió cambiar la visita al {fechaServicioLarga(cambioPendiente.fecha)}</b> · Si aceptas, la cita se mueve a esa hora.</p>
                <div className="sp-cambio-acciones">
                  <button type="button" className="pl-boton pl-boton--principal" onClick={() => responderCambio('aceptar')} disabled={procesando}>Aceptar cambio</button>
                  <button type="button" className="pl-boton pl-boton--peligro" onClick={() => responderCambio('rechazar')} disabled={procesando}>Rechazar cambio</button>
                </div>
              </>
            )}
          </div>
        )}

        <div>
          <h3>Seguimiento</h3>
          {cancelada ? (
            <div className="pl-aviso pl-aviso--info">Esta solicitud fue cancelada.</div>
          ) : (
            <ol className="sp-linea">
              {PASOS.map((p, i) => {
                const e = estadoDelPaso(solicitud.estado, i);
                return (
                  <li key={p} className={`sp-paso sp-paso--${e}`} aria-current={e === 'actual' ? 'step' : undefined}>
                    <span className="sp-punto" aria-hidden="true">{e === 'hecho' ? '✓' : ''}</span>
                    <div>
                      <b>{p}</b>
                      {fechaDelPaso(i) && e !== 'pendiente' && <span>{fechaHoraCorta(fechaDelPaso(i))}</span>}
                      {textoPaso(i) && <span>{textoPaso(i)}</span>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div>
          <h3>{contraparte.etiqueta}</h3>
          <div className="sp-contexto">
            <div className="sp-avatar" aria-hidden="true">{iniciales(contraparte.nombre, contraparte.apellido)}</div>
            <div>
              <b>{`${contraparte.nombre} ${contraparte.apellido}`.trim() || '—'}</b>
              {mostrarTelefono && (
                <a className="sp-telefono" href={`tel:${contraparte.telefono.replace(/\s+/g, '')}`}>{contraparte.telefono}</a>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3>{esCliente ? 'Tu solicitud' : 'Lo que pidió el cliente'}</h3>
          <dl className="sp-datos">
            <div><dt>Descripción</dt><dd>{solicitud.descripcion || 'Sin descripción'}</dd></div>
            {solicitud.direccion && <div><dt>Dirección</dt><dd>{solicitud.direccion}</dd></div>}
            {solicitud.fecha_servicio && <div><dt>Visita</dt><dd>{fechaServicioLarga(solicitud.fecha_servicio)}</dd></div>}
            <div><dt>Creada</dt><dd>{fechaRelativa(solicitud.fecha_solicitud) || '—'}</dd></div>
          </dl>
        </div>

        {esCliente && solicitud.estado === 'completada' && !sinCalificar && (
          <div>
            <h3>Tu calificación</h3>
            <p className="sp-calificada"><Estrellas n={solicitud.calificacion_puntuacion} /></p>
            {Array.isArray(solicitud.calificacion_motivos) && solicitud.calificacion_motivos.length > 0 && (
              <p className="sp-etiquetas-fijas">
                {solicitud.calificacion_motivos.map((m) => <span key={m}>{ETIQUETA_MOTIVO[m] || m}</span>)}
              </p>
            )}
          </div>
        )}
      </div>

      {esCliente && solicitud.estado !== 'pendiente' && (
        <div className="sp-reportar">
          {solicitud.reporte_id ? (
            <span>Ya reportaste esta solicitud. La administración la está revisando.</span>
          ) : (
            <button type="button" onClick={() => setVista('reportar')}>Reportar un problema con este servicio</button>
          )}
        </div>
      )}

      <div className="pl-pie">
        {confirmando ? (
          <div className="sp-confirmar">
            <p>¿Cancelar esta solicitud? No se puede deshacer.</p>
            <div>
              <button type="button" className="pl-boton pl-boton--peligro-solido" onClick={() => cambiar('cancelada')} disabled={procesando} data-autofocus>
                {procesando ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
              <button type="button" className="pl-boton" onClick={() => setConfirmando(false)} disabled={procesando}>No, volver</button>
            </div>
          </div>
        ) : (
          <>
            {sinCalificar && (
              <button type="button" className="pl-boton pl-boton--principal" onClick={() => onCalificar(solicitud)}>Calificar</button>
            )}

            {!esCliente && solicitud.estado === 'pendiente' && (
              <>
                <button type="button" className="pl-boton pl-boton--principal" onClick={() => cambiar('aceptada')} disabled={procesando}>Aceptar</button>
                <button type="button" className="pl-boton pl-boton--peligro" onClick={() => cambiar('cancelada')} disabled={procesando}>Rechazar</button>
              </>
            )}
            {!esCliente && solicitud.estado === 'aceptada' && (
              <button type="button" className="pl-boton pl-boton--principal" onClick={() => cambiar('en_proceso')} disabled={procesando}>Iniciar servicio</button>
            )}
            {!esCliente && solicitud.estado === 'en_proceso' && (
              <button type="button" className="pl-boton pl-boton--principal" onClick={() => cambiar('completada')} disabled={procesando}>Marcar completada</button>
            )}

            <button
              type="button"
              className={`pl-boton${!sinCalificar && esCliente && solicitud.estado !== 'pendiente' ? ' pl-boton--principal' : ''}`}
              onClick={() => setVista('chat')}
            >
              Escribir a {primerNombre}
            </button>

            {puedeReprogramar && (
              <button type="button" className="pl-boton" onClick={() => setVista('reprogramar')}>Reprogramar cita</button>
            )}

            {esCliente && solicitud.estado === 'pendiente' && solicitud.servicio_categoria_id && (
              <Link className="pl-boton" to={`/buscar?categoria_id=${solicitud.servicio_categoria_id}`} onClick={onCerrar}>Ver otros profesionales</Link>
            )}

            {esCliente && solicitud.estado === 'pendiente' && (
              <button type="button" className="pl-boton pl-boton--peligro" onClick={() => setConfirmando(true)}>Cancelar solicitud</button>
            )}
          </>
        )}
      </div>
      </>
      )}
    </PanelLateral>
  );
}
