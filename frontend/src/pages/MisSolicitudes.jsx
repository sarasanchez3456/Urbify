import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import SolicitudDrawer from '../components/SolicitudDrawer';
import CalificarPanel from '../components/CalificarPanel';
import {
  ETIQUETAS_ESTADO, ESTADOS_EN_CURSO, TIPO_TARIFA, estadoDelPaso, estaSinCalificar, formatearDinero,
  fechaServicioCorta, fechaRelativa,
} from '../utils/solicitudes';
import { logError } from '../utils/log';
import './MisSolicitudes.css';

const FILTROS = [
  ['todas', 'Todas'],
  ['curso', 'En curso'],
  ['completadas', 'Completadas'],
  ['canceladas', 'Canceladas'],
];

// Texto corto que acompaña la barra de progreso de cada solicitud.
function textoEstado(sol, esCliente) {
  switch (sol.estado) {
    case 'pendiente':
      return esCliente ? `Pendiente · enviada ${fechaRelativa(sol.fecha_solicitud)}` : 'Pendiente de tu respuesta';
    case 'completada':
      if (!esCliente) return 'Completada';
      return estaSinCalificar(sol) ? 'Completada · sin calificar' : `Completada · calificada ${'★'.repeat(sol.calificacion_puntuacion)}`;
    default:
      return ETIQUETAS_ESTADO[sol.estado] || sol.estado;
  }
}

function Fila({ sol, esCliente, ocupada, onDetalle, onCalificar, onAccion, onCambio }) {
  const contraparte = esCliente
    ? `${sol.proveedor_nombre || ''} ${sol.proveedor_apellido || ''}`.trim()
    : `${sol.cliente_nombre || ''} ${sol.cliente_apellido || ''}`.trim();
  const cancelada = sol.estado === 'cancelada';
  const sinCalificar = esCliente && estaSinCalificar(sol);
  const cambioPendiente = Boolean(sol.reprogramacion_id) && ['pendiente', 'aceptada'].includes(sol.estado);

  return (
    <div className="ms-fila">
      <div className="ms-fila-info">
        <h4>
          <button type="button" className="ms-fila-titulo" onClick={() => onDetalle(sol.id)}>{sol.servicio_titulo}</button>
        </h4>
        <p>{esCliente ? 'Proveedor' : 'Cliente'} · {contraparte || '—'}</p>
        {sol.fecha_servicio && !cancelada && <p>Visita: {fechaServicioCorta(sol.fecha_servicio)}</p>}
        {!esCliente && sol.direccion && !cancelada && <p>{sol.direccion}</p>}
        {cambioPendiente && (
          <p className="ms-cambio">
            {esCliente ? 'Pediste cambiar la visita a' : 'Pide cambiar la visita a'}: <b>{fechaServicioCorta(sol.reprogramacion_fecha)}</b>
          </p>
        )}
      </div>

      <div className="ms-fila-estado">
        {!cancelada && (
          <div className="ms-pasos" role="img" aria-label={`Estado: ${ETIQUETAS_ESTADO[sol.estado]}`}>
            {[0, 1, 2, 3].map((i) => <i key={i} className={`ms-paso ms-paso--${estadoDelPaso(sol.estado, i)}`} />)}
          </div>
        )}
        <div className={`ms-estado-texto${cancelada ? ' ms-estado-texto--cancelada' : ''}`}>{textoEstado(sol, esCliente)}</div>
      </div>

      <div className="ms-fila-precio">
        <b>{formatearDinero(sol.tarifa)}</b>
        {TIPO_TARIFA[sol.tipo_tarifa_acordada] && <small>{TIPO_TARIFA[sol.tipo_tarifa_acordada]}</small>}
      </div>

      <div className="ms-fila-acciones">
        {sinCalificar && (
          <button type="button" className="ms-btn ms-btn--principal" onClick={() => onCalificar(sol.id)}>Calificar</button>
        )}
        {!esCliente && sol.estado === 'pendiente' && (
          <>
            <button type="button" className="ms-btn ms-btn--principal" disabled={ocupada} onClick={() => onAccion(sol.id, 'aceptada')}>Aceptar</button>
            <button type="button" className="ms-btn ms-btn--peligro" disabled={ocupada} onClick={() => onAccion(sol.id, 'cancelada')}>Rechazar</button>
          </>
        )}
        {!esCliente && cambioPendiente && sol.estado === 'aceptada' && (
          <>
            <button type="button" className="ms-btn ms-btn--principal" disabled={ocupada} onClick={() => onCambio(sol, 'aceptar')}>Aceptar cambio</button>
            <button type="button" className="ms-btn ms-btn--peligro" disabled={ocupada} onClick={() => onCambio(sol, 'rechazar')}>Rechazar cambio</button>
          </>
        )}
        {!esCliente && sol.estado === 'aceptada' && !cambioPendiente && (
          <button type="button" className="ms-btn ms-btn--principal" disabled={ocupada} onClick={() => onAccion(sol.id, 'en_proceso')}>Iniciar servicio</button>
        )}
        {!esCliente && sol.estado === 'en_proceso' && (
          <button type="button" className="ms-btn ms-btn--principal" disabled={ocupada} onClick={() => onAccion(sol.id, 'completada')}>Marcar completada</button>
        )}
        <button type="button" className="ms-btn" onClick={() => onDetalle(sol.id)}>Ver detalle</button>
      </div>
    </div>
  );
}

export default function MisSolicitudes() {
  const { usuario } = useAuth();
  const esCliente = usuario?.rol === 'cliente';
  const endpoint = esCliente ? '/solicitudes/cliente' : '/solicitudes/proveedor';

  const [solicitudes, setSolicitudes] = useState([]);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [filtro, setFiltro] = useState('todas');
  const [abiertaId, setAbiertaId] = useState(null);
  const [calificandoId, setCalificandoId] = useState(null);
  const [accionandoId, setAccionandoId] = useState(null);
  const [abrirEnChat, setAbrirEnChat] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chatSolicitado = searchParams.get('chat');
  const [aviso, setAviso] = useState(null); // { texto, tipo: 'ok' | 'error' | 'info' }
  const temporizadorAviso = useRef(null);

  const mostrarAviso = useCallback((texto, tipo = 'ok') => {
    setAviso({ texto, tipo });
    clearTimeout(temporizadorAviso.current);
    temporizadorAviso.current = setTimeout(() => setAviso(null), 3200);
  }, []);

  useEffect(() => () => clearTimeout(temporizadorAviso.current), []);

  const cargar = useCallback(async () => {
    try {
      const res = await api.get(endpoint);
      setSolicitudes(Array.isArray(res.data) ? res.data : []);
      setEstado('listo');
    } catch (err) {
      logError('Error al cargar solicitudes:', err);
      setEstado((anterior) => (anterior === 'listo' ? 'listo' : 'error'));
    }
  }, [endpoint]);

  useEffect(() => {
    setEstado('cargando');
    cargar();
  }, [cargar]);

  // Las notificaciones de chat llegan con ?chat=<id de la solicitud>: se abre el panel de esa solicitud directamente en el
  // chat, solo si es una solicitud propia y no está cancelada. Después se quita el parámetro para no reabrirlo por error.
  useEffect(() => {
    if (estado !== 'listo' || !chatSolicitado) return;
    const id = Number(chatSolicitado);
    const sol = Number.isInteger(id) && id > 0 ? solicitudes.find((s) => s.id === id) : null;
    if (sol && sol.estado !== 'cancelada') {
      setAbiertaId(sol.id);
      setAbrirEnChat(true);
    }
    const sinChat = new URLSearchParams(searchParams);
    sinChat.delete('chat');
    const resto = sinChat.toString();
    navigate({ pathname: '/mis-solicitudes', search: resto ? `?${resto}` : '' }, { replace: true });
  }, [estado, chatSolicitado, solicitudes, searchParams, navigate]);

  // Cambia el estado de una solicitud (el proveedor acepta, rechaza, inicia o completa; el cliente cancela
  // una pendiente). El servidor valida quién puede hacer cada cambio; si falla se muestra su mensaje.
  const cambiarEstado = useCallback(async (id, nuevo) => {
    try {
      await api.put(`/solicitudes/${id}/estado`, { estado: nuevo });
      window.dispatchEvent(new Event('notificacion_actualizada'));
      const mensajes = {
        aceptada: 'Solicitud aceptada',
        en_proceso: 'Servicio iniciado',
        completada: 'Servicio marcado como completado',
        cancelada: esCliente ? 'Solicitud cancelada' : 'Solicitud rechazada',
      };
      mostrarAviso(mensajes[nuevo] || 'Solicitud actualizada');
      await cargar();
      return true;
    } catch (err) {
      logError('Error al cambiar el estado de la solicitud:', err);
      mostrarAviso(err.response?.data?.error || 'No se pudo actualizar la solicitud. Intenta de nuevo.', 'error');
      await cargar();
      return false;
    }
  }, [cargar, esCliente, mostrarAviso]);

  const accionar = async (id, nuevo) => {
    setAccionandoId(id);
    await cambiarEstado(id, nuevo);
    setAccionandoId(null);
  };

  // Responde un pedido de cambio de fecha: el profesional lo acepta o rechaza, el cliente lo cancela.
  const responderCambio = useCallback(async (sol, accion) => {
    try {
      await api.put(`/solicitudes/${sol.id}/reprogramaciones/${sol.reprogramacion_id}`, { accion });
      window.dispatchEvent(new Event('notificacion_actualizada'));
      mostrarAviso({ aceptar: 'Cita movida a la nueva fecha', rechazar: 'Cambio rechazado, la cita sigue igual', cancelar: 'Cambio cancelado' }[accion]);
      await cargar();
      return true;
    } catch (err) {
      logError('Error al responder el cambio de fecha:', err);
      mostrarAviso(err.response?.data?.error || 'No se pudo responder el cambio. Intenta de nuevo.', 'error');
      await cargar();
      return false;
    }
  }, [cargar, mostrarAviso]);

  const accionarCambio = async (sol, accion) => {
    setAccionandoId(sol.id);
    await responderCambio(sol, accion);
    setAccionandoId(null);
  };

  const abrirCalificar = (id) => {
    setAbiertaId(null);
    setCalificandoId(id);
  };

  // Listas por grupo según el rol (ver los textos de cada grupo más abajo).
  const listas = useMemo(() => {
    // Al profesional también le piden acción los cambios de fecha pendientes, aunque la solicitud ya esté aceptada.
    const pideCambio = (s) => Boolean(s.reprogramacion_id) && ['pendiente', 'aceptada'].includes(s.estado);
    const accion = esCliente ? solicitudes.filter(estaSinCalificar) : solicitudes.filter((s) => s.estado === 'pendiente' || pideCambio(s));
    const curso = esCliente
      ? solicitudes.filter((s) => ESTADOS_EN_CURSO.includes(s.estado))
      : solicitudes.filter((s) => (s.estado === 'aceptada' && !pideCambio(s)) || s.estado === 'en_proceso');
    const completadas = esCliente ? solicitudes.filter((s) => s.estado === 'completada' && !estaSinCalificar(s)) : solicitudes.filter((s) => s.estado === 'completada');
    const canceladas = solicitudes.filter((s) => s.estado === 'cancelada');
    return { accion, curso, completadas, canceladas };
  }, [solicitudes, esCliente]);

  const cuentas = useMemo(() => ({
    todas: solicitudes.length,
    curso: solicitudes.filter((s) => ESTADOS_EN_CURSO.includes(s.estado)).length,
    completadas: solicitudes.filter((s) => s.estado === 'completada').length,
    canceladas: solicitudes.filter((s) => s.estado === 'cancelada').length,
  }), [solicitudes]);

  const grupos = useMemo(() => {
    const tituloAccion = esCliente ? 'Requieren tu acción' : 'Requieren tu respuesta';
    const A = { clave: 'accion', titulo: tituloAccion, items: listas.accion, destacado: true };
    const C = { clave: 'curso', titulo: 'En curso', items: listas.curso };
    const D = { clave: 'completadas', titulo: 'Completadas', items: listas.completadas };
    const X = { clave: 'canceladas', titulo: 'Canceladas', items: listas.canceladas };
    let elegidos;
    if (filtro === 'curso') elegidos = esCliente ? [C] : [A, C];
    else if (filtro === 'completadas') elegidos = esCliente ? [A, D] : [D];
    else if (filtro === 'canceladas') elegidos = [X];
    else elegidos = [A, C, D, X];
    return elegidos.filter((g) => g.items.length > 0);
  }, [listas, filtro, esCliente]);

  const abierta = solicitudes.find((s) => s.id === abiertaId) || null;
  const calificando = solicitudes.find((s) => s.id === calificandoId) || null;
  const subtitulo = esCliente ? 'Solicitudes que has realizado' : 'Solicitudes que has recibido';

  return (
    <DashboardLayout titulo="Mis Solicitudes" subtitulo={subtitulo}>
      <div className="ms">
        {estado === 'cargando' && <div className="ms-tarjeta ms-estado">Cargando...</div>}

        {estado === 'error' && (
          <div className="ms-tarjeta ms-estado" role="alert">
            <p>No se pudieron cargar tus solicitudes.</p>
            <button type="button" className="ms-btn ms-btn--principal" onClick={() => { setEstado('cargando'); cargar(); }}>Reintentar</button>
          </div>
        )}

        {estado === 'listo' && solicitudes.length === 0 && (
          <div className="ms-tarjeta ms-estado">
            <h3>No hay solicitudes</h3>
            <p>{esCliente ? 'Busca servicios y solicita un profesional' : 'Aún no has recibido solicitudes'}</p>
            {esCliente && <Link to="/buscar" className="ms-btn ms-btn--principal ms-enlace">Buscar Servicios</Link>}
          </div>
        )}

        {estado === 'listo' && solicitudes.length > 0 && (
          <>
            <div className="ms-tabs" role="tablist" aria-label="Filtrar solicitudes">
              {FILTROS.map(([clave, etiqueta]) => (
                <button
                  key={clave}
                  type="button"
                  role="tab"
                  aria-selected={filtro === clave}
                  className={`ms-tab${filtro === clave ? ' is-on' : ''}`}
                  onClick={() => setFiltro(clave)}
                >
                  {etiqueta}<em>{cuentas[clave]}</em>
                </button>
              ))}
            </div>

            {grupos.length === 0 && <div className="ms-tarjeta ms-estado"><p>No hay solicitudes en esta categoría.</p></div>}

            {grupos.map((g) => (
              <section className="ms-grupo" key={g.clave} aria-label={g.titulo}>
                <h3>{g.titulo}<span>{g.items.length}</span></h3>
                <div className={`ms-lista${g.destacado ? ' ms-lista--destacada' : ''}`}>
                  {g.items.map((s) => (
                    <Fila
                      key={s.id}
                      sol={s}
                      esCliente={esCliente}
                      ocupada={accionandoId === s.id}
                      onDetalle={setAbiertaId}
                      onCalificar={abrirCalificar}
                      onAccion={accionar}
                      onCambio={accionarCambio}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {aviso && <div className={`ms-aviso ms-aviso--${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>{aviso.texto}</div>}
      </div>

      {abierta && (
        <SolicitudDrawer
          key={abierta.id}
          solicitud={abierta}
          rol={esCliente ? 'cliente' : 'proveedor'}
          vistaInicial={abrirEnChat ? 'chat' : 'detalle'}
          onCerrar={() => { setAbiertaId(null); setAbrirEnChat(false); }}
          onCambiarEstado={cambiarEstado}
          onCalificar={(s) => abrirCalificar(s.id)}
          onResponderCambio={responderCambio}
          onReporteEnviado={(yaExistia) => { mostrarAviso(yaExistia ? 'Esta solicitud ya estaba reportada.' : 'Reporte enviado. La administración lo revisará.', yaExistia ? 'info' : 'ok'); cargar(); }}
          onCambioPedido={() => { mostrarAviso('Pedido enviado. Esperando la respuesta del profesional.'); cargar(); }}
        />
      )}

      {calificando && (
        <CalificarPanel
          solicitud={calificando}
          onCerrar={() => setCalificandoId(null)}
          onCalificada={(puntuacion) => {
            setSolicitudes((prev) => prev.map((s) => (s.id === calificando.id ? { ...s, calificacion_puntuacion: puntuacion } : s)));
            setCalificandoId(null);
            mostrarAviso('¡Gracias! Tu calificación fue enviada.');
            cargar();
          }}
          onYaCalificada={() => {
            setCalificandoId(null);
            mostrarAviso('Esta solicitud ya estaba calificada.', 'info');
            cargar();
          }}
        />
      )}
    </DashboardLayout>
  );
}
