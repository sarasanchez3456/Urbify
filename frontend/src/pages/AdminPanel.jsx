import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import PanelLateral from '../components/PanelLateral';
import { ETIQUETAS_ESTADO, ETIQUETA_MOTIVO_REPORTE, iniciales, formatearDinero, fechaRelativa, fechaHoraCorta } from '../utils/solicitudes';
import { logError } from '../utils/log';
import './AdminPanel.css';

const SECCIONES = [
  ['resumen', 'Resumen'], ['usuarios', 'Usuarios'], ['servicios', 'Servicios'], ['solicitudes', 'Solicitudes'],
  ['categorias', 'Categorías'], ['resenas', 'Reseñas'], ['reportes', 'Reportes'], ['auditoria', 'Auditoría'],
];
const POR_PAGINA = 10;
const ROLES = { cliente: 'Cliente', proveedor: 'Proveedor', admin: 'Administrador' };
const COLORES_ESTADO = {
  pendiente: 'oklch(0.80 0.14 85)', aceptada: 'oklch(0.62 0.15 250)', en_proceso: 'oklch(0.60 0.17 300)',
  completada: 'oklch(0.62 0.14 155)', cancelada: 'oklch(0.62 0.17 25)',
};
const nombre = (n, a) => `${n || ''} ${a || ''}`.trim() || '—';
const sinTildes = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Descarga un CSV (con BOM para que Excel respete las tildes).
function exportarCsv(archivo, columnas, filas) {
  const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const texto = [columnas.join(','), ...filas.map((f) => f.map(celda).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([`﻿${texto}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = archivo;
  a.click();
  URL.revokeObjectURL(url);
}

function useDatos(ruta) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const cargar = useCallback(async () => {
    try {
      const res = await api.get(ruta);
      setDatos(res.data);
      setError('');
    } catch (err) {
      logError(`Error al cargar ${ruta}:`, err);
      setError(err.response?.data?.error || 'No se pudo cargar la información.');
    }
  }, [ruta]);
  useEffect(() => { setDatos(null); cargar(); }, [cargar]);
  return { datos, error, cargar };
}

// ── Ventana de confirmación; si hace falta, pide un motivo (queda en la auditoría) ──
function Confirmar({ titulo, texto, confirmar, peligro, conMotivo, etiquetaMotivo, onCancelar, onConfirmar }) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const caja = useRef(null);
  const listo = !conMotivo || motivo.trim().length >= 10;

  useEffect(() => {
    const anterior = document.activeElement;
    caja.current?.querySelector('textarea, button')?.focus();
    const tecla = (e) => { if (e.key === 'Escape') onCancelar(); };
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('keydown', tecla); anterior?.focus?.(); };
  }, [onCancelar]);

  const enviar = async () => {
    if (!listo || enviando) return;
    setEnviando(true);
    setError('');
    const fallo = await onConfirmar(motivo.trim());
    if (fallo) { setError(fallo); setEnviando(false); }
  };

  return createPortal(
    <div className="ad-velo" onClick={(e) => { if (e.target === e.currentTarget) onCancelar(); }}>
      <div className="ad-modal" role="dialog" aria-modal="true" aria-label={titulo} ref={caja}>
        <h3>{titulo}</h3>
        {texto && <p>{texto}</p>}
        {conMotivo && (
          <label>
            {etiquetaMotivo || 'Motivo'} <em>(queda en el registro de auditoría, mínimo 10 letras)</em>
            <textarea rows={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Explica brevemente por qué" />
          </label>
        )}
        {error && <div className="ad-error" role="alert">{error}</div>}
        <div className="ad-modal-acciones">
          <button type="button" className="ad-btn" onClick={onCancelar} disabled={enviando}>Cancelar</button>
          <button type="button" className={`ad-btn ${peligro ? 'ad-btn--peligro' : 'ad-btn--principal'}`} onClick={enviar} disabled={!listo || enviando}>{enviando ? 'Un momento...' : confirmar}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Paginador({ total, pagina, setPagina }) {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const actual = Math.min(pagina, paginas - 1);
  return (
    <div className="ad-pager">
      <span>{total ? `${actual * POR_PAGINA + 1}–${Math.min(total, actual * POR_PAGINA + POR_PAGINA)} de ${total}` : '0 resultados'}</span>
      <div>
        <button type="button" className="ad-btn" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>Anterior</button>
        <button type="button" className="ad-btn" disabled={actual >= paginas - 1} onClick={() => setPagina(actual + 1)}>Siguiente</button>
      </div>
    </div>
  );
}

const Chips = ({ opciones, valor, onElegir, etiqueta }) => (
  <div className="ad-chips" role="group" aria-label={etiqueta}>
    {opciones.map(([v, t]) => <button key={v} type="button" className={`ad-chip${valor === v ? ' is-on' : ''}`} aria-pressed={valor === v} onClick={() => onElegir(v)}>{t}</button>)}
  </div>
);

const Cargando = ({ datos, error, cargar, children }) => {
  if (error && !datos) return <div className="ad-tarjeta ad-vacio" role="alert"><p>{error}</p><button type="button" className="ad-btn" onClick={cargar}>Reintentar</button></div>;
  if (!datos) return <div className="ad-tarjeta ad-vacio">Cargando...</div>;
  return children;
};

// ── Resumen ──
function Resumen({ ir }) {
  const [semanas, setSemanas] = useState(8);
  const { datos, error, cargar } = useDatos(`/admin/resumen?semanas=${semanas}`);
  return (
    <Cargando datos={datos} error={error} cargar={cargar}>
      {datos && (() => {
        const e = datos.solicitudes_por_estado;
        const totalSol = Object.values(e).reduce((a, b) => a + b, 0);
        const totalUsu = Object.values(datos.usuarios_por_rol).reduce((a, b) => a + b, 0);
        const max = Math.max(1, ...datos.semanas.map((w) => Math.max(w.usuarios, w.solicitudes)));
        const a = datos.atencion;
        const atencion = [
          [a.solicitudes_pendientes, 'solicitud pendiente de respuesta', 'solicitudes pendientes de respuesta', 'solicitudes', 'pendiente'],
          [a.resenas_bajas, 'reseña con 2 estrellas o menos', 'reseñas con 2 estrellas o menos', 'resenas', 'bajas'],
          [a.servicios_no_disponibles, 'servicio no disponible', 'servicios no disponibles', 'servicios', 'oculto'],
          [a.reportes_nuevos, 'reporte nuevo', 'reportes nuevos', 'reportes', 'nuevo'],
          [a.usuarios_suspendidos, 'usuario suspendido', 'usuarios suspendidos', 'usuarios', 'sus'],
        ].filter((x) => x[0] > 0);
        return (
          <div className="ad-pila">
            <div className="ad-tarjeta ad-kpis">
              <div><small>Usuarios</small><b>{totalUsu}</b><span>{datos.usuarios_por_rol.cliente} clientes · {datos.usuarios_por_rol.proveedor} proveedores</span></div>
              <div><small>Servicios</small><b>{datos.servicios.total}</b><span>{datos.servicios.disponibles} disponibles</span></div>
              <div><small>Solicitudes</small><b>{totalSol}</b><span>{e.completada} completadas</span></div>
              <div><small>Calificación media</small><b>{datos.calificaciones.total ? String(datos.calificaciones.media).replace('.', ',') : '—'}</b><span>{datos.calificaciones.total} calificaciones</span></div>
            </div>

            <div className="ad-tarjeta">
              <div className="ad-titulo-fila">
                <h2>Actividad por semana</h2>
                <select value={semanas} onChange={(ev) => setSemanas(Number(ev.target.value))} aria-label="Periodo">
                  {[4, 8, 12].map((n) => <option key={n} value={n}>Últimas {n} semanas</option>)}
                </select>
              </div>
              <div className="ad-leyenda"><span><i style={{ background: 'oklch(0.55 0.16 250)' }} />Solicitudes nuevas</span><span><i style={{ background: 'oklch(0.72 0.13 200)' }} />Usuarios nuevos</span></div>
              <div className="ad-barras">
                {datos.semanas.map((w) => (
                  <div key={w.hasta} className="ad-barra-grupo">
                    <div className="ad-barra-pares">
                      <i title={`${w.solicitudes} solicitudes`} style={{ height: `${(w.solicitudes / max) * 100}%`, background: 'oklch(0.55 0.16 250)' }} />
                      <i title={`${w.usuarios} usuarios`} style={{ height: `${(w.usuarios / max) * 100}%`, background: 'oklch(0.72 0.13 200)' }} />
                    </div>
                    <small>{new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).format(new Date(w.hasta)).replace('.', '')}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="ad-dos">
              <div className="ad-tarjeta">
                <h2>Solicitudes por estado</h2>
                <div className="ad-franja" role="img" aria-label="Solicitudes por estado">
                  {Object.keys(COLORES_ESTADO).map((k) => <i key={k} style={{ flex: e[k], background: COLORES_ESTADO[k] }} title={`${ETIQUETAS_ESTADO[k]}: ${e[k]}`} />)}
                </div>
                <div className="ad-leg">
                  {Object.keys(COLORES_ESTADO).map((k) => (
                    <div key={k}><i style={{ background: COLORES_ESTADO[k] }} /><span>{ETIQUETAS_ESTADO[k]}</span><b>{e[k]}</b><small>{totalSol ? Math.round((e[k] / totalSol) * 100) : 0}%</small></div>
                  ))}
                </div>
              </div>
              <div className="ad-tarjeta">
                <h2>Requiere atención</h2>
                {atencion.length === 0 ? <p className="ad-suave">Todo en orden por ahora.</p> : (
                  <div className="ad-atencion">
                    {atencion.map(([n, uno, varios, sec, filtro]) => (
                      <button key={sec} type="button" onClick={() => ir(sec, filtro)}><i />{n} {n === 1 ? uno : varios}<span>Ver →</span></button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </Cargando>
  );
}

// ── Usuarios ──
function DetalleUsuario({ id, onCerrar, onCambio }) {
  const { datos, error, cargar } = useDatos(`/admin/usuarios/${id}`);
  const [confirmando, setConfirmando] = useState(false);

  const cambiar = async (motivo) => {
    try {
      await api.put(`/admin/usuarios/${id}/estado`, { activo: !datos.activo, motivo });
      setConfirmando(false);
      await cargar();
      onCambio();
      return null;
    } catch (err) {
      return err.response?.data?.error || 'No se pudo cambiar el estado de la cuenta.';
    }
  };

  return (
    <PanelLateral onCerrar={onCerrar} etiqueta="Detalle del usuario" ancho={480}>
      <div className="pl-cabecera">
        <div className="pl-cabecera-fila">
          <span className={`ad-etiqueta ad-etiqueta--${datos?.rol || 'cliente'}`}>{ROLES[datos?.rol] || 'Usuario'}</span>
          <button type="button" className="pl-cerrar" onClick={onCerrar} aria-label="Cerrar" data-autofocus>×</button>
        </div>
        <h2 className="pl-titulo">{datos ? nombre(datos.nombre, datos.apellido) : 'Cargando...'}</h2>
      </div>
      <div className="pl-cuerpo">
        {error && !datos && <div className="pl-aviso pl-aviso--error" role="alert">{error}</div>}
        {datos && (
          <>
            <div>
              <h3>Cuenta</h3>
              <dl className="ad-datos">
                <div><dt>Correo</dt><dd>{datos.correo}</dd></div>
                <div><dt>Teléfono</dt><dd>{datos.telefono || '—'}</dd></div>
                {datos.direccion && <div><dt>Dirección</dt><dd>{datos.direccion}</dd></div>}
                {datos.oficio && <div><dt>Oficio</dt><dd>{datos.oficio}</dd></div>}
                <div><dt>Estado</dt><dd><span className={`ad-est${datos.activo ? '' : ' is-no'}`}><i />{datos.activo ? 'Activo' : 'Suspendido'}</span></dd></div>
                <div><dt>Registro</dt><dd>{fechaHoraCorta(datos.fecha_creacion)}</dd></div>
              </dl>
            </div>
            <div>
              <h3>Actividad</h3>
              <dl className="ad-datos">
                <div><dt>Como cliente</dt><dd>{datos.solicitudes_como_cliente} solicitudes</dd></div>
                {datos.rol === 'proveedor' && (
                  <>
                    <div><dt>Como proveedor</dt><dd>{datos.solicitudes_como_proveedor} solicitudes</dd></div>
                    <div><dt>Servicios</dt><dd>{datos.servicios}</dd></div>
                    <div><dt>Calificación</dt><dd>{datos.calificacion_media ? `${String(datos.calificacion_media).replace('.', ',')} (${datos.calificaciones_recibidas})` : 'Sin calificaciones'}</dd></div>
                  </>
                )}
              </dl>
            </div>
            {datos.ultimas_solicitudes.length > 0 && (
              <div>
                <h3>Últimas solicitudes</h3>
                <ul className="ad-lista-simple">
                  {datos.ultimas_solicitudes.map((s) => <li key={s.id}><span>N.º {s.id} · {s.servicio_titulo}</span><span className={`ad-tag ad-tag--${s.estado}`}>{ETIQUETAS_ESTADO[s.estado]}</span></li>)}
                </ul>
              </div>
            )}
            {datos.rol === 'admin' && <p className="ad-nota">Los administradores solo se gestionan desde el servidor.</p>}
          </>
        )}
      </div>
      {datos && datos.rol !== 'admin' && (
        <div className="pl-pie">
          <button type="button" className={`pl-boton ${datos.activo ? 'pl-boton--peligro' : 'pl-boton--principal'}`} onClick={() => setConfirmando(true)}>
            {datos.activo ? 'Suspender cuenta' : 'Reactivar cuenta'}
          </button>
        </div>
      )}
      {confirmando && datos && (
        <Confirmar
          titulo={datos.activo ? `Suspender a ${datos.nombre}` : `Reactivar a ${datos.nombre}`}
          texto={datos.activo ? 'No podrá iniciar sesión y se cerrarán sus sesiones abiertas. Puedes reactivarla después.' : 'Podrá volver a iniciar sesión.'}
          confirmar={datos.activo ? 'Suspender' : 'Reactivar'}
          peligro={datos.activo}
          conMotivo
          onCancelar={() => setConfirmando(false)}
          onConfirmar={cambiar}
        />
      )}
    </PanelLateral>
  );
}

function Usuarios({ filtroInicial }) {
  const { datos, error, cargar } = useDatos('/auth/');
  const [rol, setRol] = useState(filtroInicial || '');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(0);
  const [abierto, setAbierto] = useState(null);

  const filtrados = useMemo(() => (datos || []).filter((u) => (
    (!rol || (rol === 'sus' ? !u.activo : u.rol === rol))
    && (!q || sinTildes(`${u.nombre} ${u.apellido} ${u.correo}`).includes(sinTildes(q)))
  )), [datos, rol, q]);
  const filas = filtrados.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);

  return (
    <Cargando datos={datos} error={error} cargar={cargar}>
      <div className="ad-tarjeta">
        <div className="ad-herramientas">
          <input className="ad-buscar" placeholder="Buscar por nombre o correo" aria-label="Buscar usuario" value={q} onChange={(e) => { setQ(e.target.value); setPagina(0); }} />
          <button type="button" className="ad-btn" onClick={() => exportarCsv('usuarios.csv', ['Nombre', 'Correo', 'Teléfono', 'Rol', 'Estado', 'Registro'], filtrados.map((u) => [nombre(u.nombre, u.apellido), u.correo, u.telefono, ROLES[u.rol], u.activo ? 'Activo' : 'Suspendido', u.fecha_creacion]))}>Exportar CSV</button>
        </div>
        <Chips etiqueta="Filtrar por rol" valor={rol} onElegir={(v) => { setRol(v); setPagina(0); }} opciones={[['', 'Todos'], ['cliente', 'Clientes'], ['proveedor', 'Proveedores'], ['admin', 'Administradores'], ['sus', 'Suspendidos']]} />
        {filas.length === 0 ? <p className="ad-vacio-interno">No hay usuarios con esos filtros.</p> : (
          <div className="ad-tabla-caja">
            <table>
              <thead><tr><th>Usuario</th><th>Rol</th><th>Teléfono</th><th>Estado</th><th>Registro</th></tr></thead>
              <tbody>
                {filas.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <button type="button" className="ad-usuario" onClick={() => setAbierto(u.id)}>
                        <span className="ad-avatar" aria-hidden="true">{iniciales(u.nombre, u.apellido)}</span>
                        <span><b>{nombre(u.nombre, u.apellido)}</b><small>{u.correo}</small></span>
                      </button>
                    </td>
                    <td><span className={`ad-etiqueta ad-etiqueta--${u.rol}`}>{ROLES[u.rol]}</span></td>
                    <td className="ad-num">{u.telefono || '—'}</td>
                    <td><span className={`ad-est${u.activo ? '' : ' is-no'}`}><i />{u.activo ? 'Activo' : 'Suspendido'}</span></td>
                    <td className="ad-suave">{fechaRelativa(u.fecha_creacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginador total={filtrados.length} pagina={pagina} setPagina={setPagina} />
      </div>
      {abierto && <DetalleUsuario id={abierto} onCerrar={() => setAbierto(null)} onCambio={cargar} />}
    </Cargando>
  );
}

// ── Servicios ──
function Servicios({ filtroInicial }) {
  const { datos, error, cargar } = useDatos('/admin/servicios');
  const [filtro, setFiltro] = useState(filtroInicial || '');
  const [pagina, setPagina] = useState(0);
  const [accion, setAccion] = useState(null);
  const filtrados = (datos || []).filter((s) => !filtro || (filtro === 'oculto' ? !s.disponible : s.disponible));
  const filas = filtrados.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);

  const cambiar = async (motivo) => {
    try {
      await api.put(`/admin/servicios/${accion.id}/disponible`, { disponible: !accion.disponible, motivo });
      setAccion(null);
      await cargar();
      return null;
    } catch (err) {
      return err.response?.data?.error || 'No se pudo cambiar el servicio.';
    }
  };

  return (
    <Cargando datos={datos} error={error} cargar={cargar}>
      <div className="ad-tarjeta">
        <Chips etiqueta="Filtrar servicios" valor={filtro} onElegir={(v) => { setFiltro(v); setPagina(0); }} opciones={[['', 'Todos'], ['disp', 'Disponibles'], ['oculto', 'Ocultos']]} />
        {filas.length === 0 ? <p className="ad-vacio-interno">No hay servicios con ese filtro.</p> : (
          <div className="ad-tabla-caja">
            <table>
              <thead><tr><th>Servicio</th><th>Proveedor</th><th>Categoría</th><th>Tarifa</th><th>Estado</th><th><span className="ad-solo-lectores">Acción</span></th></tr></thead>
              <tbody>
                {filas.map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.titulo}</b></td>
                    <td>{nombre(s.proveedor_nombre, s.proveedor_apellido)}</td>
                    <td className="ad-suave">{s.categoria_nombre}</td>
                    <td className="ad-num">{formatearDinero(s.tarifa)}</td>
                    <td><span className={`ad-est${s.disponible ? '' : ' is-no'}`}><i />{s.disponible ? 'Disponible' : 'Oculto'}</span></td>
                    <td className="ad-der"><button type="button" className={`ad-enlace${s.disponible ? ' ad-enlace--peligro' : ''}`} onClick={() => setAccion(s)}>{s.disponible ? 'Ocultar' : 'Mostrar'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginador total={filtrados.length} pagina={pagina} setPagina={setPagina} />
      </div>
      {accion && (
        <Confirmar
          titulo={accion.disponible ? 'Ocultar servicio' : 'Mostrar servicio'}
          texto={accion.disponible ? `"${accion.titulo}" dejará de aparecer en las búsquedas, sin borrarse.` : `"${accion.titulo}" volverá a aparecer en las búsquedas.`}
          confirmar={accion.disponible ? 'Ocultar' : 'Mostrar'}
          peligro={accion.disponible}
          conMotivo
          onCancelar={() => setAccion(null)}
          onConfirmar={cambiar}
        />
      )}
    </Cargando>
  );
}

// ── Solicitudes ──
function Solicitudes({ filtroInicial }) {
  const { datos, error, cargar } = useDatos('/admin/solicitudes');
  const [estado, setEstado] = useState(filtroInicial || '');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(0);
  const [accion, setAccion] = useState(null);

  const filtrados = useMemo(() => (datos || []).filter((s) => (
    (!estado || s.estado === estado)
    && (!q || sinTildes(`${s.servicio_titulo} ${s.cliente_nombre} ${s.cliente_apellido} ${s.proveedor_nombre} ${s.proveedor_apellido}`).includes(sinTildes(q)))
  )), [datos, estado, q]);
  const filas = filtrados.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);
  const cuenta = (k) => (datos || []).filter((s) => s.estado === k).length;

  const cancelar = async (motivo) => {
    try {
      await api.put(`/admin/solicitudes/${accion.id}/cancelar`, { motivo });
      setAccion(null);
      await cargar();
      return null;
    } catch (err) {
      return err.response?.data?.error || 'No se pudo cancelar la solicitud.';
    }
  };

  return (
    <Cargando datos={datos} error={error} cargar={cargar}>
      <div className="ad-tarjeta">
        <div className="ad-herramientas">
          <input className="ad-buscar" placeholder="Buscar por servicio, cliente o proveedor" aria-label="Buscar solicitud" value={q} onChange={(e) => { setQ(e.target.value); setPagina(0); }} />
          <button type="button" className="ad-btn" onClick={() => exportarCsv('solicitudes.csv', ['N.º', 'Servicio', 'Cliente', 'Proveedor', 'Estado', 'Fecha', 'Tarifa'], filtrados.map((s) => [s.id, s.servicio_titulo, nombre(s.cliente_nombre, s.cliente_apellido), nombre(s.proveedor_nombre, s.proveedor_apellido), ETIQUETAS_ESTADO[s.estado], s.fecha_solicitud, s.tarifa]))}>Exportar CSV</button>
        </div>
        <Chips etiqueta="Filtrar por estado" valor={estado} onElegir={(v) => { setEstado(v); setPagina(0); }} opciones={[['', `Todas (${(datos || []).length})`], ...Object.keys(COLORES_ESTADO).map((k) => [k, `${ETIQUETAS_ESTADO[k]} (${cuenta(k)})`])]} />
        {filas.length === 0 ? <p className="ad-vacio-interno">No hay solicitudes con esos filtros.</p> : (
          <div className="ad-tabla-caja">
            <table>
              <thead><tr><th>N.º</th><th>Servicio</th><th>Cliente</th><th>Proveedor</th><th>Estado</th><th>Fecha</th><th>Tarifa</th><th><span className="ad-solo-lectores">Acción</span></th></tr></thead>
              <tbody>
                {filas.map((s) => (
                  <tr key={s.id}>
                    <td className="ad-num ad-suave">{s.id}</td>
                    <td>{s.servicio_titulo}</td>
                    <td>{nombre(s.cliente_nombre, s.cliente_apellido)}</td>
                    <td>{nombre(s.proveedor_nombre, s.proveedor_apellido)}</td>
                    <td><span className={`ad-tag ad-tag--${s.estado}`}>{ETIQUETAS_ESTADO[s.estado]}</span></td>
                    <td className="ad-suave">{fechaRelativa(s.fecha_solicitud)}</td>
                    <td className="ad-num">{formatearDinero(s.tarifa)}</td>
                    <td className="ad-der">{['pendiente', 'aceptada', 'en_proceso'].includes(s.estado) && <button type="button" className="ad-enlace ad-enlace--peligro" onClick={() => setAccion(s)}>Cancelar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginador total={filtrados.length} pagina={pagina} setPagina={setPagina} />
      </div>
      {accion && (
        <Confirmar
          titulo={`Cancelar la solicitud N.º ${accion.id}`}
          texto="Se avisa al cliente y al profesional con el motivo que escribas. No se puede deshacer."
          confirmar="Cancelar solicitud"
          peligro
          conMotivo
          onCancelar={() => setAccion(null)}
          onConfirmar={cancelar}
        />
      )}
    </Cargando>
  );
}

// ── Categorías (usa los endpoints existentes de categorías) ──
function Categorias() {
  const { datos, error, cargar } = useDatos('/categorias');
  const [edicion, setEdicion] = useState(null); // null | 'nueva' | categoría
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [borrando, setBorrando] = useState(null);

  const abrir = (c) => { setEdicion(c); setForm({ nombre: c === 'nueva' ? '' : c.nombre, descripcion: c === 'nueva' ? '' : c.descripcion || '' }); setAviso(''); };
  const guardar = async () => {
    if (!form.nombre.trim() || guardando) return;
    setGuardando(true);
    setAviso('');
    try {
      const cuerpo = { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null };
      if (edicion === 'nueva') await api.post('/categorias', cuerpo);
      else await api.put(`/categorias/${edicion.id}`, cuerpo);
      setEdicion(null);
      await cargar();
    } catch (err) {
      setAviso(err.response?.data?.error || 'No se pudo guardar la categoría.');
    } finally {
      setGuardando(false);
    }
  };
  const eliminar = async () => {
    try {
      await api.delete(`/categorias/${borrando.id}`);
      setBorrando(null);
      await cargar();
      return null;
    } catch (err) {
      return err.response?.data?.error || 'No se pudo eliminar la categoría.';
    }
  };

  return (
    <Cargando datos={datos} error={error} cargar={cargar}>
      <div className="ad-tarjeta">
        <div className="ad-titulo-fila">
          <h2>{(datos || []).length} categorías</h2>
          {!edicion && <button type="button" className="ad-btn ad-btn--principal" onClick={() => abrir('nueva')}>Nueva categoría</button>}
        </div>
        <p className="ad-suave">Una categoría con servicios no se puede eliminar.</p>
        {edicion && (
          <div className="ad-form">
            <label>Nombre<input maxLength={100} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus /></label>
            <label>Descripción <em>(opcional)</em><textarea rows={2} maxLength={300} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label>
            {aviso && <div className="ad-error" role="alert">{aviso}</div>}
            <div className="ad-modal-acciones">
              <button type="button" className="ad-btn" onClick={() => setEdicion(null)}>Cancelar</button>
              <button type="button" className="ad-btn ad-btn--principal" onClick={guardar} disabled={!form.nombre.trim() || guardando}>{guardando ? 'Guardando...' : edicion === 'nueva' ? 'Crear categoría' : 'Guardar cambios'}</button>
            </div>
          </div>
        )}
        {(datos || []).map((c) => (
          <div className="ad-fila-cat" key={c.id}>
            <b>{c.nombre}</b>
            <p>{c.descripcion || <span className="ad-suave">Sin descripción</span>}</p>
            <div><button type="button" className="ad-enlace" onClick={() => abrir(c)}>Editar</button><button type="button" className="ad-enlace ad-enlace--peligro" onClick={() => setBorrando(c)}>Eliminar</button></div>
          </div>
        ))}
      </div>
      {borrando && <Confirmar titulo={`Eliminar "${borrando.nombre}"`} texto="No se puede deshacer. Si tiene servicios, el sistema no lo permitirá." confirmar="Eliminar" peligro onCancelar={() => setBorrando(null)} onConfirmar={eliminar} />}
    </Cargando>
  );
}

// ── Reseñas ──
function Resenas({ filtroInicial }) {
  const { datos, error, cargar } = useDatos('/admin/resenas');
  const [filtro, setFiltro] = useState(filtroInicial || '');
  const [accion, setAccion] = useState(null);
  const visibles = (datos || []).filter((r) => !r.oculta);
  const media = visibles.length ? visibles.reduce((t, r) => t + r.puntuacion, 0) / visibles.length : 0;
  const filtradas = (datos || []).filter((r) => !filtro || (filtro === 'bajas' ? r.puntuacion <= 2 && !r.oculta : r.oculta));

  const cambiar = async (motivo) => {
    try {
      await api.put(`/admin/resenas/${accion.id}/oculta`, { oculta: !accion.oculta, motivo });
      setAccion(null);
      await cargar();
      return null;
    } catch (err) {
      return err.response?.data?.error || 'No se pudo cambiar la reseña.';
    }
  };

  return (
    <Cargando datos={datos} error={error} cargar={cargar}>
      <div className="ad-tarjeta">
        <div className="ad-herramientas">
          <Chips etiqueta="Filtrar reseñas" valor={filtro} onElegir={setFiltro} opciones={[['', `Todas (${(datos || []).length})`], ['bajas', 'Más bajas'], ['ocultas', `Ocultas (${(datos || []).length - visibles.length})`]]} />
          <span className="ad-suave">Media: <b>{String(media.toFixed(1)).replace('.', ',')}</b></span>
        </div>
        <p className="ad-suave">Oculta las que sean abusivas o falsas. Una reseña oculta no cuenta en la calificación del profesional.</p>
        {filtradas.length === 0 ? <p className="ad-vacio-interno">No hay reseñas con ese filtro.</p> : filtradas.map((r) => (
          <div className={`ad-resena${r.oculta ? ' is-oculta' : ''}`} key={r.id}>
            <div>
              <span className="ad-estrellas" aria-label={`${r.puntuacion} de 5 estrellas`}>{'★'.repeat(r.puntuacion)}{'☆'.repeat(5 - r.puntuacion)}</span> {r.oculta && <span className="ad-tag ad-tag--oculta">Oculta</span>}
              <p>{r.comentario || <span className="ad-suave">Sin comentario</span>}</p>
              <small>{nombre(r.cliente_nombre, r.cliente_apellido)} → {nombre(r.proveedor_nombre, r.proveedor_apellido)} · {fechaRelativa(r.fecha_creacion)}</small>
            </div>
            <button type="button" className={`ad-enlace${r.oculta ? '' : ' ad-enlace--peligro'}`} onClick={() => setAccion(r)}>{r.oculta ? 'Restaurar' : 'Ocultar'}</button>
          </div>
        ))}
      </div>
      {accion && (
        <Confirmar
          titulo={accion.oculta ? 'Restaurar reseña' : 'Ocultar reseña'}
          texto={accion.oculta ? 'Volverá a mostrarse y a contar en la calificación.' : 'Dejará de mostrarse y de contar en la calificación del profesional.'}
          confirmar={accion.oculta ? 'Restaurar' : 'Ocultar'}
          peligro={!accion.oculta}
          conMotivo
          onCancelar={() => setAccion(null)}
          onConfirmar={cambiar}
        />
      )}
    </Cargando>
  );
}

// ── Reportes ──
const ESTADOS_REPORTE = { nuevo: 'Nuevo', revision: 'En revisión', resuelto: 'Resuelto' };
function Reportes({ filtroInicial }) {
  const { datos, error, cargar } = useDatos('/admin/reportes');
  const [filtro, setFiltro] = useState(filtroInicial || '');
  const [accion, setAccion] = useState(null); // { tipo: 'resolver' | 'suspender', reporte }
  const [aviso, setAviso] = useState('');
  const filtrados = (datos || []).filter((r) => !filtro || r.estado === filtro);

  const marcarRevision = async (r) => {
    setAviso('');
    try {
      await api.put(`/admin/reportes/${r.id}`, { estado: 'revision' });
      await cargar();
    } catch (err) {
      setAviso(err.response?.data?.error || 'No se pudo actualizar el reporte.');
    }
  };

  const confirmar = async (texto) => {
    try {
      if (accion.tipo === 'resolver') await api.put(`/admin/reportes/${accion.reporte.id}`, { estado: 'resuelto', nota: texto });
      else await api.put(`/admin/usuarios/${accion.reporte.reportado_id}/estado`, { activo: false, motivo: texto });
      setAccion(null);
      await cargar();
      return null;
    } catch (err) {
      return err.response?.data?.error || 'No se pudo completar la acción.';
    }
  };

  return (
    <Cargando datos={datos} error={error} cargar={cargar}>
      <div className="ad-tarjeta">
        <Chips etiqueta="Filtrar reportes" valor={filtro} onElegir={setFiltro} opciones={[['', `Todos (${(datos || []).length})`], ...Object.entries(ESTADOS_REPORTE).map(([k, t]) => [k, `${t} (${(datos || []).filter((r) => r.estado === k).length})`])]} />
        <p className="ad-suave">Lo que los clientes reportan de un profesional. El profesional no ve estos reportes.</p>
        {aviso && <div className="ad-error" role="alert">{aviso}</div>}
        {filtrados.length === 0 ? <p className="ad-vacio-interno">No hay reportes con ese filtro.</p> : filtrados.map((r) => (
          <div className="ad-resena" key={r.id}>
            <div>
              <b>{ETIQUETA_MOTIVO_REPORTE[r.motivo] || r.motivo}</b> <span className={`ad-tag ad-tag--rep-${r.estado}`}>{ESTADOS_REPORTE[r.estado]}</span>
              <p>{r.detalle}</p>
              <small>De {nombre(r.reportante_nombre, r.reportante_apellido)} contra <b>{nombre(r.reportado_nombre, r.reportado_apellido)}</b> · solicitud N.º {r.solicitud_id} · {fechaRelativa(r.fecha)}{r.total_contra_reportado > 1 ? ` · ${r.total_contra_reportado} reportes contra este profesional` : ''}</small>
              {r.nota_admin && <p className="ad-nota-resolucion">Nota: {r.nota_admin}</p>}
            </div>
            <div className="ad-acciones-col">
              {r.estado === 'nuevo' && <button type="button" className="ad-enlace" onClick={() => marcarRevision(r)}>Marcar en revisión</button>}
              {r.estado !== 'resuelto' && <button type="button" className="ad-enlace" onClick={() => setAccion({ tipo: 'resolver', reporte: r })}>Resolver</button>}
              {r.reportado_activo && <button type="button" className="ad-enlace ad-enlace--peligro" onClick={() => setAccion({ tipo: 'suspender', reporte: r })}>Suspender a {r.reportado_nombre}</button>}
            </div>
          </div>
        ))}
      </div>
      {accion && (
        <Confirmar
          titulo={accion.tipo === 'resolver' ? 'Resolver el reporte' : `Suspender a ${accion.reporte.reportado_nombre}`}
          texto={accion.tipo === 'resolver' ? 'Cuenta qué se hizo para resolverlo.' : 'No podrá iniciar sesión y se cerrarán sus sesiones abiertas. Puedes reactivarlo después. El reporte no se resuelve solo: ciérralo aparte.'}
          confirmar={accion.tipo === 'resolver' ? 'Resolver' : 'Suspender'}
          peligro={accion.tipo === 'suspender'}
          conMotivo
          etiquetaMotivo={accion.tipo === 'resolver' ? 'Nota de resolución' : 'Motivo'}
          onCancelar={() => setAccion(null)}
          onConfirmar={confirmar}
        />
      )}
    </Cargando>
  );
}

// ── Auditoría ──
const TIPOS_AUDITORIA = [['', 'Todo'], ['usuario', 'Usuarios'], ['servicio', 'Servicios'], ['solicitud', 'Solicitudes'], ['resena', 'Reseñas'], ['categoria', 'Categorías'], ['reporte', 'Reportes']];
function Auditoria() {
  const [tipo, setTipo] = useState('');
  const [pagina, setPagina] = useState(0);
  const { datos, error, cargar } = useDatos(`/admin/auditoria${tipo ? `?tipo=${tipo}` : ''}`);
  const filas = (datos || []).slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);
  return (
    <Cargando datos={datos} error={error} cargar={cargar}>
      <div className="ad-tarjeta">
        <div className="ad-herramientas">
          <Chips etiqueta="Filtrar por tipo" valor={tipo} onElegir={(v) => { setTipo(v); setPagina(0); }} opciones={TIPOS_AUDITORIA} />
          <button type="button" className="ad-btn" onClick={() => exportarCsv('auditoria.csv', ['Fecha', 'Administrador', 'Acción', 'Sobre', 'Motivo'], (datos || []).map((a) => [a.fecha, nombre(a.admin_nombre, a.admin_apellido), a.accion, a.objeto, a.motivo]))}>Exportar CSV</button>
        </div>
        <p className="ad-suave">Todo lo que hace un administrador queda aquí: quién, qué y cuándo.</p>
        {filas.length === 0 ? <p className="ad-vacio-interno">Aún no hay acciones registradas.</p> : (
          <div className="ad-tabla-caja">
            <table>
              <thead><tr><th>Fecha</th><th>Administrador</th><th>Acción</th><th>Motivo</th></tr></thead>
              <tbody>
                {filas.map((a) => (
                  <tr key={a.id}>
                    <td className="ad-suave ad-nowrap">{fechaHoraCorta(a.fecha)}</td>
                    <td>{nombre(a.admin_nombre, a.admin_apellido)}</td>
                    <td>{a.accion} <b>{a.objeto}</b></td>
                    <td className="ad-suave">{a.motivo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginador total={(datos || []).length} pagina={pagina} setPagina={setPagina} />
      </div>
    </Cargando>
  );
}

export default function AdminPanel() {
  const [seccion, setSeccion] = useState('resumen');
  const [filtro, setFiltro] = useState('');
  const [clave, setClave] = useState(0); // fuerza reiniciar la sección al llegar desde "Requiere atención"

  const ir = (sec, f = '') => { setSeccion(sec); setFiltro(f); setClave((n) => n + 1); };
  const titulo = SECCIONES.find(([s]) => s === seccion)?.[1];

  return (
    <DashboardLayout titulo="Panel de administración" subtitulo="Gestión de Urbify">
      <div className="ad">
        <nav className="ad-nav" aria-label="Secciones del panel">
          {SECCIONES.map(([s, t]) => (
            <button key={s} type="button" className={`ad-nav-item${seccion === s ? ' is-on' : ''}`} aria-current={seccion === s ? 'page' : undefined} onClick={() => ir(s)}>{t}</button>
          ))}
        </nav>
        <h1>{titulo}</h1>
        <div key={`${seccion}-${clave}`}>
          {seccion === 'resumen' && <Resumen ir={ir} />}
          {seccion === 'usuarios' && <Usuarios filtroInicial={filtro} />}
          {seccion === 'servicios' && <Servicios filtroInicial={filtro} />}
          {seccion === 'solicitudes' && <Solicitudes filtroInicial={filtro} />}
          {seccion === 'categorias' && <Categorias />}
          {seccion === 'resenas' && <Resenas filtroInicial={filtro} />}
          {seccion === 'reportes' && <Reportes filtroInicial={filtro} />}
          {seccion === 'auditoria' && <Auditoria />}
        </div>
      </div>
    </DashboardLayout>
  );
}
