import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import PanelLateral from '../components/PanelLateral';
import { formatearDinero } from '../utils/solicitudes';
import { logError } from '../utils/log';
import './MisServicios.css';

const FORM_VACIO = { categoria_id: '', titulo: '', descripcion: '', tarifa: '', tipo_tarifa: 'hora' };

// Crear o editar un servicio en un panel lateral. La tarifa solo admite dígitos (pesos enteros): lo que no sea
// un número se descarta al escribir o pegar, y mientras no haya una tarifa válida no se puede guardar.
function PanelServicio({ servicio, categorias, onCerrar, onGuardado }) {
  const editando = Boolean(servicio);
  const [form, setForm] = useState(editando
    ? { categoria_id: String(servicio.categoria_id), titulo: servicio.titulo, descripcion: servicio.descripcion || '', tarifa: String(Math.round(Number(servicio.tarifa) || 0)), tipo_tarifa: servicio.tipo_tarifa || 'hora' }
    : FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const cambiar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const tarifaNumero = Number(form.tarifa);
  const titulo = form.titulo.trim();
  const valido = (editando || form.categoria_id) && titulo.length >= 5 && form.tarifa !== '' && tarifaNumero > 0;

  const guardar = async (e) => {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setError('');
    try {
      const cuerpo = { titulo, descripcion: form.descripcion.trim(), tarifa: tarifaNumero, tipo_tarifa: form.tipo_tarifa };
      if (editando) await api.put(`/servicios/${servicio.id}`, cuerpo);
      else await api.post('/servicios', { ...cuerpo, categoria_id: Number(form.categoria_id) });
      onGuardado(editando ? 'Servicio actualizado' : 'Servicio publicado');
    } catch (err) {
      logError('Error al guardar el servicio:', err);
      setError(err.response?.data?.error || 'No se pudo guardar el servicio. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PanelLateral onCerrar={onCerrar} etiqueta={editando ? 'Editar servicio' : 'Nuevo servicio'} ancho={480}>
      <form onSubmit={guardar} className="mv-form" noValidate>
        <div className="pl-cabecera">
          <div className="pl-cabecera-fila">
            <h2 className="pl-titulo">{editando ? 'Editar servicio' : 'Nuevo servicio'}</h2>
            <button type="button" className="pl-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
          </div>
        </div>

        <div className="pl-cuerpo">
          <label className="mv-campo">
            <span>Categoría</span>
            {editando ? (
              <input value={servicio.categoria_nombre} disabled />
            ) : (
              <select value={form.categoria_id} onChange={(e) => cambiar('categoria_id', e.target.value)} data-autofocus>
                <option value="">Elige una categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            )}
          </label>

          <label className="mv-campo">
            <span>Título</span>
            <input value={form.titulo} maxLength={150} onChange={(e) => cambiar('titulo', e.target.value)} placeholder="Ej: Reparación de fugas en baños y cocinas" data-autofocus={editando ? true : undefined} />
            {form.titulo !== '' && titulo.length < 5 && <small className="mv-error">Escribe al menos 5 letras.</small>}
          </label>

          <label className="mv-campo">
            <span>Descripción <em>(opcional)</em></span>
            <textarea rows={4} maxLength={2000} value={form.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} placeholder="Qué incluye, con qué trabajas y en qué zonas atiendes." />
          </label>

          <fieldset className="mv-campo">
            <legend>Cómo cobras</legend>
            <div className="mv-opciones">
              {[['hora', 'Por hora'], ['fijo', 'Precio fijo']].map(([valor, texto]) => (
                <label key={valor} className={`mv-opcion${form.tipo_tarifa === valor ? ' is-on' : ''}`}>
                  <input type="radio" name="tipo_tarifa" value={valor} checked={form.tipo_tarifa === valor} onChange={() => cambiar('tipo_tarifa', valor)} />
                  {texto}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mv-campo">
            <span>Tarifa (pesos)</span>
            <div className="mv-dinero">
              <b aria-hidden="true">$</b>
              <input
                inputMode="numeric"
                autoComplete="off"
                maxLength={9}
                value={form.tarifa}
                onChange={(e) => cambiar('tarifa', e.target.value.replace(/\D/g, ''))}
                placeholder="60000"
              />
            </div>
            {form.tarifa !== '' && tarifaNumero > 0 && <small className="mv-ayuda">{formatearDinero(tarifaNumero)} {form.tipo_tarifa === 'hora' ? 'por hora' : 'en total'}</small>}
            {form.tarifa !== '' && tarifaNumero === 0 && <small className="mv-error">La tarifa debe ser mayor que cero.</small>}
            <small className="mv-ayuda">Solo números.</small>
          </label>

          {error && <div className="pl-aviso pl-aviso--error" role="alert">{error}</div>}
        </div>

        <div className="pl-pie">
          <button type="submit" className="pl-boton pl-boton--principal" disabled={!valido || enviando}>
            {enviando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Publicar servicio'}
          </button>
          <button type="button" className="pl-boton" onClick={onCerrar} disabled={enviando}>Cancelar</button>
        </div>
      </form>
    </PanelLateral>
  );
}

export default function MisServicios() {
  const [servicios, setServicios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [panel, setPanel] = useState(null); // null | 'nuevo' | objeto del servicio que se edita
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [ocupadoId, setOcupadoId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const temporizador = useRef(null);

  const mostrarAviso = useCallback((texto, tipo = 'ok') => {
    setAviso({ texto, tipo });
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(null), 4500);
  }, []);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/servicios/mios');
      setServicios(Array.isArray(res.data) ? res.data : []);
      setEstado('listo');
    } catch (err) {
      logError('Error al cargar servicios:', err);
      setEstado((e) => (e === 'listo' ? e : 'error'));
    }
  }, []);

  useEffect(() => {
    cargar();
    api.get('/categorias').then((r) => setCategorias(Array.isArray(r.data) ? r.data : [])).catch((e) => logError(e));
  }, [cargar]);

  const alternar = async (s) => {
    if (ocupadoId) return;
    setOcupadoId(s.id);
    try {
      await api.put(`/servicios/${s.id}`, { disponible: s.disponible ? 0 : 1 });
      mostrarAviso(s.disponible ? 'Servicio pausado: ya no aparece en las búsquedas' : 'Servicio visible otra vez');
      await cargar();
    } catch (err) {
      logError(err);
      mostrarAviso(err.response?.data?.error || 'No se pudo cambiar el estado del servicio.', 'error');
    } finally {
      setOcupadoId(null);
    }
  };

  const eliminar = async (s) => {
    if (ocupadoId) return;
    setOcupadoId(s.id);
    try {
      await api.delete(`/servicios/${s.id}`);
      setConfirmandoId(null);
      mostrarAviso('Servicio eliminado');
      await cargar();
    } catch (err) {
      logError(err);
      // 409: ya tiene solicitudes o reseñas; el servidor sugiere pausarlo.
      mostrarAviso(err.response?.data?.error || 'No se pudo eliminar el servicio.', 'error');
      setConfirmandoId(null);
    } finally {
      setOcupadoId(null);
    }
  };

  const visibles = servicios.filter((s) => s.disponible).length;

  return (
    <DashboardLayout titulo="Mis Servicios" subtitulo="Lo que ofreces a tus clientes">
      <div className="mv">
        {estado === 'cargando' && <div className="mv-tarjeta mv-estado">Cargando...</div>}
        {estado === 'error' && (
          <div className="mv-tarjeta mv-estado" role="alert">
            <p>No se pudieron cargar tus servicios.</p>
            <button type="button" className="mv-btn mv-btn--principal" onClick={() => { setEstado('cargando'); cargar(); }}>Reintentar</button>
          </div>
        )}

        {estado === 'listo' && (
          <>
            <div className="mv-barra">
              <p>
                {servicios.length === 0 ? 'Aún no has publicado servicios' : `${servicios.length} ${servicios.length === 1 ? 'servicio' : 'servicios'} · ${visibles} ${visibles === 1 ? 'visible' : 'visibles'} para los clientes`}
              </p>
              <button type="button" className="mv-btn mv-btn--principal" onClick={() => setPanel('nuevo')}>+ Nuevo servicio</button>
            </div>

            {servicios.length === 0 && (
              <div className="mv-tarjeta mv-estado">
                <h3>Publica tu primer servicio</h3>
                <p>Los clientes te encuentran por lo que ofreces. Cuéntales qué haces y cuánto cobras.</p>
                <button type="button" className="mv-btn mv-btn--principal" onClick={() => setPanel('nuevo')}>Crear servicio</button>
              </div>
            )}

            <ul className="mv-lista">
              {servicios.map((s) => {
                const confirmando = confirmandoId === s.id;
                return (
                  <li key={s.id} className={`mv-tarjeta mv-servicio${s.disponible ? '' : ' is-pausado'}`}>
                    <div className="mv-servicio-cabecera">
                      <span className="mv-categoria">{s.categoria_nombre}</span>
                      <label className="mv-interruptor" title={s.disponible ? 'Visible para los clientes' : 'Pausado: no aparece en las búsquedas'}>
                        <input type="checkbox" checked={Boolean(s.disponible)} onChange={() => alternar(s)} disabled={ocupadoId === s.id} />
                        <span className="mv-interruptor-pista" aria-hidden="true" />
                        <span>{s.disponible ? 'Visible' : 'Pausado'}</span>
                      </label>
                    </div>
                    <h3>{s.titulo}</h3>
                    {s.descripcion && <p className="mv-descripcion">{s.descripcion}</p>}
                    <div className="mv-precio">
                      <b>{formatearDinero(s.tarifa)}</b>
                      <span>{s.tipo_tarifa === 'fijo' ? 'precio fijo' : 'por hora'}</span>
                    </div>

                    {confirmando ? (
                      <div className="mv-confirmar" role="alert">
                        <p>¿Eliminar este servicio? No se puede deshacer. Si ya tuvo solicitudes, mejor pausarlo.</p>
                        <div>
                          <button type="button" className="mv-btn mv-btn--peligro-solido" onClick={() => eliminar(s)} disabled={ocupadoId === s.id}>Sí, eliminar</button>
                          <button type="button" className="mv-btn" onClick={() => setConfirmandoId(null)}>No, volver</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mv-acciones">
                        <button type="button" className="mv-btn" onClick={() => setPanel(s)}>Editar</button>
                        <Link to={`/servicio/${s.id}`} className="mv-btn">Ver como cliente</Link>
                        <button type="button" className="mv-btn mv-btn--peligro" onClick={() => setConfirmandoId(s.id)}>Eliminar</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {aviso && <div className={`mv-aviso mv-aviso--${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>{aviso.texto}</div>}
      </div>

      {panel && (
        <PanelServicio
          servicio={panel === 'nuevo' ? null : panel}
          categorias={categorias}
          onCerrar={() => setPanel(null)}
          onGuardado={(msg) => { setPanel(null); mostrarAviso(msg); cargar(); }}
        />
      )}
    </DashboardLayout>
  );
}
