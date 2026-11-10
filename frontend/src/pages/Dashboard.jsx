import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import {
  ETIQUETAS_ESTADO, ESTADOS_EN_CURSO, estaSinCalificar, formatearDinero, fechaServicioLarga, fechaServicioCorta, iniciales,
} from '../utils/solicitudes';
import { logError } from '../utils/log';
import './Dashboard.css';

const saludo = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
};

const fechaDeHoy = () => new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' }).format(new Date());

const pideCambio = (s) => Boolean(s.reprogramacion_id) && ['pendiente', 'aceptada'].includes(s.estado);

function Contraparte({ sol, esCliente }) {
  const nombre = esCliente ? `${sol.proveedor_nombre || ''} ${sol.proveedor_apellido || ''}` : `${sol.cliente_nombre || ''} ${sol.cliente_apellido || ''}`;
  return nombre.trim() || '—';
}

// Fila compacta de una solicitud: lleva a Mis Solicitudes, donde está el detalle completo.
function FilaSolicitud({ sol, esCliente, detalle }) {
  return (
    <Link to="/mis-solicitudes" className="in-fila">
      <span className="in-avatar" aria-hidden="true">
        {esCliente ? iniciales(sol.proveedor_nombre, sol.proveedor_apellido) : iniciales(sol.cliente_nombre, sol.cliente_apellido)}
      </span>
      <span className="in-fila-texto">
        <b>{sol.servicio_titulo}</b>
        <small><Contraparte sol={sol} esCliente={esCliente} />{detalle ? ` · ${detalle}` : ''}</small>
      </span>
      <span className={`in-estado in-estado--${sol.estado}`}>{ETIQUETAS_ESTADO[sol.estado] || sol.estado}</span>
    </Link>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const esCliente = usuario?.rol === 'cliente';

  const [solicitudes, setSolicitudes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [horarioConfigurado, setHorarioConfigurado] = useState(true);
  const [verificado, setVerificado] = useState(true); // true mientras carga: no parpadea el aviso
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const [sol, extra, verif] = await Promise.all([
          api.get(esCliente ? '/solicitudes/cliente' : '/solicitudes/proveedor'),
          // Cliente: categorías para buscar. Proveedor: si ya configuró su agenda.
          api.get(esCliente ? '/categorias' : '/proveedores/mi-horario').catch((e) => { logError(e); return null; }),
          // Proveedor: si ya está verificado (para ofrecerle la verificación).
          esCliente ? null : api.get('/verificaciones/mia').then((r) => r.data).catch((e) => { logError(e); return { verificado: true }; }),
        ]);
        if (cancelado) return;
        if (!esCliente) setVerificado(Boolean(verif?.verificado));
        setSolicitudes(Array.isArray(sol.data) ? sol.data : []);
        if (esCliente) setCategorias(Array.isArray(extra?.data) ? extra.data : []);
        else if (extra) setHorarioConfigurado(Boolean(extra.data?.horario_configurado));
        setEstado('listo');
      } catch (err) {
        logError('Error al cargar el inicio:', err);
        if (!cancelado) setEstado('error');
      }
    })();
    return () => { cancelado = true; };
  }, [esCliente]);

  const datos = useMemo(() => {
    const ahora = Date.now();
    const proximas = solicitudes
      .filter((s) => ESTADOS_EN_CURSO.includes(s.estado) && s.fecha_servicio)
      .sort((a, b) => new Date(a.fecha_servicio) - new Date(b.fecha_servicio))
      // Se mantienen las de la última hora (el servicio puede estar en curso) y las futuras.
      .filter((s) => new Date(s.fecha_servicio).getTime() >= ahora - 60 * 60 * 1000);
    const porResponder = solicitudes.filter((s) => s.estado === 'pendiente' || pideCambio(s));
    return {
      proximas,
      porResponder,
      sinCalificar: solicitudes.filter(estaSinCalificar),
      recientes: solicitudes.slice(0, 4),
      pendientes: solicitudes.filter((s) => s.estado === 'pendiente').length,
      enCurso: solicitudes.filter((s) => s.estado === 'en_proceso').length,
      completadas: solicitudes.filter((s) => s.estado === 'completada').length,
    };
  }, [solicitudes]);

  const buscar = (e) => {
    e.preventDefault();
    navigate(busqueda.trim() ? `/buscar?q=${encodeURIComponent(busqueda.trim())}` : '/buscar');
  };

  const primerNombre = (usuario?.nombre || '').split(' ')[0];
  const proxima = datos.proximas[0];

  return (
    <DashboardLayout>
      <div className="in">
        <header className="in-cabecera">
          <p>{fechaDeHoy()}</p>
          <h2>{saludo()}{primerNombre ? `, ${primerNombre}` : ''}</h2>
        </header>

        {estado === 'cargando' && <div className="in-tarjeta in-vacio">Cargando...</div>}
        {estado === 'error' && <div className="in-tarjeta in-vacio" role="alert">No se pudo cargar tu inicio. Recarga la página.</div>}

        {estado === 'listo' && esCliente && (
          <div className="in-grid">
            <div className="in-columna">
              <section className="in-tarjeta in-buscar" aria-label="Buscar un servicio">
                <h2>¿Qué necesitas hoy?</h2>
                <form onSubmit={buscar}>
                  <label className="in-solo-lectores" htmlFor="in-q">Buscar un servicio</label>
                  <input id="in-q" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej: fuga en el baño, instalar un tomacorriente" />
                  <button type="submit" className="in-btn in-btn--principal">Buscar</button>
                </form>
                {categorias.length > 0 && (
                  <div className="in-chips">
                    {categorias.map((c) => <Link key={c.id} to={`/buscar?categoria_id=${c.id}`} className="in-chip">{c.nombre}</Link>)}
                  </div>
                )}
              </section>

              <section className="in-tarjeta" aria-label="Tu próxima cita">
                <h2>Tu próxima cita</h2>
                {proxima ? (
                  <div className="in-proxima">
                    <div className="in-proxima-fecha">{fechaServicioLarga(proxima.fecha_servicio)}</div>
                    <p><b>{proxima.servicio_titulo}</b> con <Contraparte sol={proxima} esCliente /></p>
                    <p className="in-suave">
                      {proxima.estado === 'pendiente' ? 'Esperando que el profesional la acepte.' : proxima.estado === 'en_proceso' ? 'El trabajo está en curso.' : 'Confirmada por el profesional.'}
                      {pideCambio(proxima) && ' Pediste cambiar la fecha y esperas respuesta.'}
                    </p>
                    <Link to="/mis-solicitudes" className="in-btn">Ver detalle</Link>
                  </div>
                ) : (
                  <div className="in-vacio-interno">
                    <p>No tienes citas próximas.</p>
                    <Link to="/buscar" className="in-btn in-btn--principal">Buscar un profesional</Link>
                  </div>
                )}
              </section>
            </div>

            <div className="in-columna">
              {datos.sinCalificar.length > 0 && (
                <section className="in-tarjeta in-atencion" aria-label="Pendiente por calificar">
                  <h2>Cuéntanos cómo te fue</h2>
                  <ul>
                    {datos.sinCalificar.slice(0, 3).map((s) => (
                      <li key={s.id}><FilaSolicitud sol={s} esCliente detalle="sin calificar" /></li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="in-tarjeta" aria-label="Solicitudes recientes">
                <div className="in-titulo-fila">
                  <h2>Solicitudes recientes</h2>
                  <Link to="/mis-solicitudes">Ver todas</Link>
                </div>
                {datos.recientes.length === 0 ? (
                  <p className="in-suave">Aún no has pedido ningún servicio.</p>
                ) : (
                  <ul>{datos.recientes.map((s) => <li key={s.id}><FilaSolicitud sol={s} esCliente detalle={fechaServicioCorta(s.fecha_servicio)} /></li>)}</ul>
                )}
              </section>
            </div>
          </div>
        )}

        {estado === 'listo' && !esCliente && (
          <div className="in-grid">
            <div className="in-columna">
              <section className={`in-tarjeta${datos.porResponder.length > 0 ? ' in-atencion' : ''}`} aria-label="Por responder">
                <h2>{datos.porResponder.length > 0 ? 'Esperan tu respuesta' : 'Todo al día'}</h2>
                {datos.porResponder.length === 0 ? (
                  <p className="in-suave">No tienes solicitudes ni cambios de fecha por responder.</p>
                ) : (
                  <>
                    <ul>
                      {datos.porResponder.slice(0, 4).map((s) => (
                        <li key={s.id}><FilaSolicitud sol={s} esCliente={false} detalle={pideCambio(s) ? 'pide cambiar la fecha' : fechaServicioCorta(s.fecha_servicio)} /></li>
                      ))}
                    </ul>
                    <Link to="/mis-solicitudes" className="in-btn in-btn--principal">Responder ahora</Link>
                  </>
                )}
              </section>

              <section className="in-tarjeta" aria-label="Próximas visitas">
                <div className="in-titulo-fila">
                  <h2>Próximas visitas</h2>
                  <Link to="/mis-solicitudes">Ver todas</Link>
                </div>
                {datos.proximas.length === 0 ? (
                  <p className="in-suave">No tienes visitas programadas.</p>
                ) : (
                  <ul>
                    {datos.proximas.slice(0, 5).map((s) => (
                      <li key={s.id}>
                        <Link to="/mis-solicitudes" className="in-visita">
                          <span className="in-visita-hora">{fechaServicioCorta(s.fecha_servicio)}</span>
                          <span className="in-fila-texto"><b>{s.servicio_titulo}</b><small><Contraparte sol={s} esCliente={false} />{s.direccion ? ` · ${s.direccion}` : ''}</small></span>
                          <span className={`in-estado in-estado--${s.estado}`}>{ETIQUETAS_ESTADO[s.estado]}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="in-columna">
              {!verificado && (
                <section className="in-tarjeta in-aviso-agenda" aria-label="Verificación">
                  <h2>Consigue la insignia “Verificado”</h2>
                  <p>Los clientes confían más en profesionales verificados. Solo toma subir tres documentos.</p>
                  <Link to="/verificacion" className="in-btn in-btn--principal">Verificar mi cuenta</Link>
                </section>
              )}

              {!horarioConfigurado && (
                <section className="in-tarjeta in-aviso-agenda" aria-label="Agenda">
                  <h2>Configura tu agenda</h2>
                  <p>Aún no definiste tus horas de atención, así que se ofrece de 8:00 a. m. a 6:00 p. m. todos los días.</p>
                  <Link to="/mi-agenda" className="in-btn in-btn--principal">Definir mi horario</Link>
                </section>
              )}

              <section className="in-tarjeta" aria-label="Resumen">
                <h2>Tu resumen</h2>
                <dl className="in-cifras">
                  <div><dd>{datos.pendientes}</dd><dt>Por aceptar</dt></div>
                  <div><dd>{datos.enCurso}</dd><dt>En curso</dt></div>
                  <div><dd>{datos.completadas}</dd><dt>Completadas</dt></div>
                </dl>
                {solicitudes.length > 0 && (
                  <p className="in-suave">Ingresos estimados de lo completado: <b>{formatearDinero(solicitudes.filter((s) => s.estado === 'completada').reduce((t, s) => t + Number(s.tarifa || 0), 0))}</b>{' '}
                    <span title="Suma de las tarifas acordadas; las tarifas por hora dependen de las horas trabajadas">(tarifas base)</span>
                  </p>
                )}
              </section>

              <section className="in-tarjeta" aria-label="Accesos">
                <h2>Accesos</h2>
                <div className="in-accesos">
                  <Link to="/mis-servicios" className="in-btn">Mis servicios</Link>
                  <Link to="/mi-agenda" className="in-btn">Mi agenda</Link>
                  <Link to="/ingresos" className="in-btn">Billetera</Link>
                  <Link to="/perfil" className="in-btn">Mi perfil</Link>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
