import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import SelectorHorario from '../components/SelectorHorario';
import { useAuth } from '../context/AuthContext';
import { logError } from '../utils/log';
import { ETIQUETAS_ESTADO, claveDia, horaMensaje } from '../utils/solicitudes';

const etiquetaDiaLarga = (iso) => new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' }).format(new Date(iso));
import './MiAgenda.css';

// Lunes primero (el servidor usa 0 = domingo ... 6 = sábado).
const DIAS = [
  { n: 1, nombre: 'Lunes' }, { n: 2, nombre: 'Martes' }, { n: 3, nombre: 'Miércoles' }, { n: 4, nombre: 'Jueves' },
  { n: 5, nombre: 'Viernes' }, { n: 6, nombre: 'Sábado' }, { n: 0, nombre: 'Domingo' },
];
const HORAS = Array.from({ length: 19 }, (_, i) => `${String(i + 5).padStart(2, '0')}:00`); // 05:00 a 23:00
const MAX_FRANJAS_POR_DIA = 4;

const aMinutos = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const etiquetaHora = (t) => {
  const h = Number(t.slice(0, 2));
  return `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'a. m.' : 'p. m.'}`;
};

// El estado se guarda como { [dia]: [{ inicio, fin }] } y se convierte a la lista plana del servidor al guardar.
const desdeServidor = (franjas) => {
  const porDia = {};
  for (const f of franjas) (porDia[f.dia_semana] ||= []).push({ inicio: f.hora_inicio, fin: f.hora_fin });
  return porDia;
};
const haciaServidor = (porDia) =>
  Object.entries(porDia).flatMap(([dia, lista]) => lista.map((f) => ({ dia_semana: Number(dia), hora_inicio: f.inicio, hora_fin: f.fin })));

// Mismas reglas que el servidor: cada franja dura al menos una hora y las de un día no se solapan.
function errorDeDia(lista) {
  const ordenada = [...lista].sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio));
  for (let i = 0; i < ordenada.length; i += 1) {
    if (aMinutos(ordenada[i].fin) - aMinutos(ordenada[i].inicio) < 60) return 'Cada franja debe durar al menos una hora.';
    if (i > 0 && aMinutos(ordenada[i].inicio) < aMinutos(ordenada[i - 1].fin)) return 'Las franjas de un mismo día no pueden cruzarse.';
  }
  return '';
}

export default function MiAgenda() {
  const { usuario } = useAuth();
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [porDia, setPorDia] = useState({});
  const [guardado, setGuardado] = useState('{}'); // lo último que tiene el servidor, para saber si hay cambios
  const [configurado, setConfigurado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const temporizador = useRef(null);

  const mostrarAviso = useCallback((texto, tipo = 'ok') => {
    setAviso({ texto, tipo });
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(null), 3500);
  }, []);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const aplicar = useCallback((datos) => {
    const mapa = desdeServidor(datos.franjas || []);
    setPorDia(mapa);
    setGuardado(JSON.stringify(mapa));
    setConfigurado(Boolean(datos.horario_configurado));
  }, []);

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/proveedores/mi-horario');
      aplicar(res.data);
      setEstado('listo');
    } catch (err) {
      logError('Error al cargar el horario:', err);
      setEstado('error');
    }
  }, [aplicar]);
  useEffect(() => { cargar(); }, [cargar]);

  const errores = useMemo(() => Object.fromEntries(DIAS.map((d) => [d.n, errorDeDia(porDia[d.n] || [])])), [porDia]);
  // Sin ningún día activo el servidor volvería al horario por defecto (8:00 a 6:00 todos los días): para eso existe
  // "Borrar mi horario". Guardar una agenda vacía por accidente ofrecería horas que el profesional no quiere.
  const sinDias = Object.keys(porDia).length === 0;
  const hayErrores = Object.values(errores).some(Boolean) || sinDias;
  const [vista, setVista] = useState(0); // sube al guardar para refrescar la vista previa
  const [visitas, setVisitas] = useState(null); // [[día, [solicitudes]]] de las próximas visitas

  useEffect(() => {
    let cancelado = false;
    api.get('/solicitudes/proveedor').then((res) => {
      if (cancelado) return;
      const ahora = Date.now() - 60 * 60 * 1000;
      const activas = (Array.isArray(res.data) ? res.data : [])
        .filter((s) => ['pendiente', 'aceptada', 'en_proceso'].includes(s.estado) && s.fecha_servicio && new Date(s.fecha_servicio).getTime() >= ahora)
        .sort((a, b) => new Date(a.fecha_servicio) - new Date(b.fecha_servicio));
      const grupos = new Map();
      for (const s of activas) {
        const k = claveDia(s.fecha_servicio);
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k).push(s);
      }
      setVisitas([...grupos.entries()]);
    }).catch((err) => { logError(err); if (!cancelado) setVisitas([]); });
    return () => { cancelado = true; };
  }, []);
  const hayCambios = JSON.stringify(porDia) !== guardado;

  const cambiarDia = (dia, fn) => setPorDia((prev) => {
    const lista = fn(prev[dia] || []);
    const siguiente = { ...prev };
    if (lista.length === 0) delete siguiente[dia]; else siguiente[dia] = lista;
    return siguiente;
  });

  const alternarDia = (dia) => cambiarDia(dia, (lista) => (lista.length > 0 ? [] : [{ inicio: '09:00', fin: '17:00' }]));
  const agregarFranja = (dia) => cambiarDia(dia, (lista) => {
    const ultimo = lista[lista.length - 1];
    const inicio = ultimo ? HORAS.find((h) => aMinutos(h) >= aMinutos(ultimo.fin) + 60) || '' : '09:00';
    if (!inicio) return lista;
    const fin = HORAS.find((h) => aMinutos(h) >= aMinutos(inicio) + 120) || HORAS[HORAS.length - 1];
    return [...lista, { inicio, fin }];
  });
  const cambiarFranja = (dia, i, campo, valor) => cambiarDia(dia, (lista) => lista.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  const quitarFranja = (dia, i) => cambiarDia(dia, (lista) => lista.filter((_, j) => j !== i));

  const guardar = async (franjas = haciaServidor(porDia)) => {
    if (guardando) return;
    setGuardando(true);
    try {
      const res = await api.put('/proveedores/mi-horario', { franjas });
      aplicar(res.data);
      setVista((n) => n + 1);
      mostrarAviso(franjas.length > 0 ? 'Horario guardado' : 'Horario borrado: se ofrece el horario por defecto (8:00 a. m. a 6:00 p. m.)');
    } catch (err) {
      logError('Error al guardar el horario:', err);
      mostrarAviso(err.response?.data?.error || 'No se pudo guardar el horario. Intenta de nuevo.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <DashboardLayout titulo="Mi agenda" subtitulo="Las horas en las que atiendes">
      <div className="ag">
        {estado === 'cargando' && <div className="ag-tarjeta ag-estado">Cargando...</div>}
        {estado === 'error' && (
          <div className="ag-tarjeta ag-estado" role="alert">
            <p>No se pudo cargar tu horario.</p>
            <button type="button" className="ag-btn ag-btn--principal" onClick={() => { setEstado('cargando'); cargar(); }}>Reintentar</button>
          </div>
        )}

        {estado === 'listo' && (
          <>
            <div className="ag-tarjeta ag-intro">
              <h3>Tu horario semanal</h3>
              <p>
                Los clientes solo pueden pedirte citas dentro de estas horas, y cada cita ocupa una hora. Cuando alguien reserva o te pide
                cambiar la fecha, esa hora deja de aparecer libre para los demás.
              </p>
              {!configurado && (
                <p className="ag-nota">Aún no has configurado tu horario: mientras tanto se ofrece todos los días de 8:00 a. m. a 6:00 p. m.</p>
              )}
            </div>

            <div className="ag-tarjeta">
              <ul className="ag-dias">
                {DIAS.map((d) => {
                  const lista = porDia[d.n] || [];
                  const activo = lista.length > 0;
                  return (
                    <li key={d.n} className="ag-dia">
                      <div className="ag-dia-cabecera">
                        <label className="ag-interruptor">
                          <input type="checkbox" checked={activo} onChange={() => alternarDia(d.n)} />
                          <span className="ag-interruptor-pista" aria-hidden="true" />
                          <b>{d.nombre}</b>
                        </label>
                        {!activo && <span className="ag-dia-libre">No atiendes</span>}
                      </div>

                      {activo && (
                        <div className="ag-franjas">
                          {lista.map((f, i) => (
                            <div className="ag-franja" key={i}>
                              <label>
                                <span className="ag-solo-lectores">{d.nombre}, franja {i + 1}: desde</span>
                                <select value={f.inicio} onChange={(e) => cambiarFranja(d.n, i, 'inicio', e.target.value)}>
                                  {HORAS.slice(0, -1).map((h) => <option key={h} value={h}>{etiquetaHora(h)}</option>)}
                                </select>
                              </label>
                              <span aria-hidden="true">a</span>
                              <label>
                                <span className="ag-solo-lectores">{d.nombre}, franja {i + 1}: hasta</span>
                                <select value={f.fin} onChange={(e) => cambiarFranja(d.n, i, 'fin', e.target.value)}>
                                  {HORAS.slice(1).map((h) => <option key={h} value={h}>{etiquetaHora(h)}</option>)}
                                </select>
                              </label>
                              <button type="button" className="ag-quitar" onClick={() => quitarFranja(d.n, i)} aria-label={`Quitar franja ${i + 1} de ${d.nombre}`}>×</button>
                            </div>
                          ))}
                          {lista.length < MAX_FRANJAS_POR_DIA && (
                            <button type="button" className="ag-agregar" onClick={() => agregarFranja(d.n)}>+ Agregar otra franja</button>
                          )}
                          {errores[d.n] && <p className="ag-error" role="alert">{errores[d.n]}</p>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="ag-pie">
                <button type="button" className="ag-btn ag-btn--principal" onClick={() => guardar()} disabled={!hayCambios || hayErrores || guardando}>
                  {guardando ? 'Guardando...' : 'Guardar horario'}
                </button>
                {hayCambios && <button type="button" className="ag-btn" onClick={() => setPorDia(JSON.parse(guardado))} disabled={guardando}>Descartar cambios</button>}
                {sinDias && hayCambios && <p className="ag-error" role="alert">Activa al menos un día. Para volver al horario por defecto usa "Borrar mi horario".</p>}
                {configurado && !hayCambios && (
                  <button type="button" className="ag-btn ag-btn--peligro" onClick={() => guardar([])} disabled={guardando}>Borrar mi horario</button>
                )}
              </div>
            </div>

            <div className="ag-tarjeta">
              <h3>Tus próximas visitas</h3>
              {visitas === null ? <p className="ag-nota-chica">Cargando...</p> : visitas.length === 0 ? (
                <p className="ag-nota-chica">No tienes visitas programadas.</p>
              ) : (
                <div className="ag-visitas">
                  {visitas.map(([dia, lista]) => (
                    <div key={dia}>
                      <h4>{etiquetaDiaLarga(lista[0].fecha_servicio)}</h4>
                      <ul>
                        {lista.map((v) => (
                          <li key={v.id}>
                            <time className="ag-hora">{horaMensaje(v.fecha_servicio)}</time>
                            <span><b>{v.servicio_titulo}</b><small>{`${v.cliente_nombre || ''} ${v.cliente_apellido || ''}`.trim()}{v.direccion ? ` · ${v.direccion}` : ''}</small></span>
                            <em className={`ag-estado ag-estado--${v.estado}`}>{ETIQUETAS_ESTADO[v.estado]}</em>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {usuario?.id && (
              <div className="ag-tarjeta">
                <h3>Así lo ven tus clientes</h3>
                <p className="ag-nota-chica">Estas son las horas que se ofrecen en los próximos 14 días. Las que no aparecen están fuera de tu horario; las tachadas ya tienen cita.</p>
                <SelectorHorario proveedorId={usuario.id} valor="" onElegir={() => {}} recarga={vista} soloLectura />
              </div>
            )}
          </>
        )}

        {aviso && <div className={`ag-aviso ag-aviso--${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>{aviso.texto}</div>}
      </div>
    </DashboardLayout>
  );
}
