import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import SelectorHorario from '../components/SelectorHorario';
import { geocodificarDireccion, coordenadasADireccion, estaDentroDeColombia } from '../utils/colombia';
import { leerUbicacion, guardarUbicacion, distanciaKm, textoDistancia } from '../utils/ubicacion';
import { TIPO_TARIFA_LARGO, formatearDinero, fechaServicioLarga, iniciales, fechaRelativa } from '../utils/solicitudes';
import { logError } from '../utils/log';
import './ServicioDetalle.css';

const DIRECCION_VALIDA = /^[\p{L}\p{N}\s#\-.,°ºª/()']+$/u;

function Estrellas({ n }) {
  const entero = Math.round(Number(n) || 0);
  return <span className="sv-estrellas" aria-label={`${entero} de 5 estrellas`}>{'★'.repeat(entero)}{'☆'.repeat(5 - entero)}</span>;
}

// ── Formulario para pedir el servicio (mismo flujo que ver el servicio: no hay otra pantalla) ──
function FormularioSolicitud({ servicio, onEnviada }) {
  const [descripcion, setDescripcion] = useState('');
  const [inicio, setInicio] = useState(''); // hora elegida (ISO)
  const [recarga, setRecarga] = useState(0);
  const guardada = useRef(leerUbicacion());
  const [direccion, setDireccion] = useState(guardada.current?.direccion || '');
  const [coords, setCoords] = useState(guardada.current ? { lat: guardada.current.lat, lng: guardada.current.lng } : null);
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const debounce = useRef(null);

  useEffect(() => () => clearTimeout(debounce.current), []);

  const escribirDireccion = (valor) => {
    setDireccion(valor);
    setCoords(null); // lo escrito a mano ya no corresponde a las coordenadas anteriores
    clearTimeout(debounce.current);
    if (valor.trim().length < 3) { setSugerencias([]); return; }
    debounce.current = setTimeout(async () => {
      setBuscando(true);
      setSugerencias(await geocodificarDireccion(valor).catch(() => []));
      setBuscando(false);
    }, 450);
  };

  const elegirSugerencia = (s) => {
    const texto = s.display_name.split(',').slice(0, 3).join(',').trim();
    setDireccion(texto);
    setCoords({ lat: s.lat, lng: s.lon });
    setSugerencias([]);
    guardarUbicacion({ lat: s.lat, lng: s.lon, direccion: texto });
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) { setError('Tu navegador no permite obtener la ubicación.'); return; }
    setLocalizando(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        if (!estaDentroDeColombia(c.latitude, c.longitude)) {
          setError('Tu ubicación actual no está dentro de Colombia.');
          setLocalizando(false);
          return;
        }
        const texto = await coordenadasADireccion(c.latitude, c.longitude);
        setDireccion(texto);
        setCoords({ lat: c.latitude, lng: c.longitude });
        setSugerencias([]);
        guardarUbicacion({ lat: c.latitude, lng: c.longitude, direccion: texto });
        setLocalizando(false);
      },
      (err) => {
        setError(err.code === 1
          ? 'El navegador no tiene permiso para usar tu ubicación. Permítelo en el candado junto a la dirección de la página, o escríbela a mano.'
          : 'No se pudo obtener tu ubicación. Escríbela a mano.');
        setLocalizando(false);
      },
      { timeout: 10000 }
    );
  };

  const direccionLimpia = direccion.trim();
  const errorDireccion = direccionLimpia.length < 5 ? 'Escribe la dirección donde se hará el servicio.' : !DIRECCION_VALIDA.test(direccionLimpia) ? 'La dirección tiene caracteres no permitidos.' : '';
  const puedeEnviar = descripcion.trim().length > 0 && inicio && !errorDireccion && !enviando;

  const enviar = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;
    setEnviando(true);
    setError('');
    try {
      await api.post('/solicitudes', {
        servicio_id: servicio.id,
        descripcion: descripcion.trim(),
        fecha_servicio: inicio,
        direccion: direccionLimpia,
        latitud: coords?.lat ?? null,
        longitud: coords?.lng ?? null,
      });
      window.dispatchEvent(new Event('notificacion_actualizada'));
      onEnviada(inicio);
    } catch (err) {
      logError('Error al enviar la solicitud:', err);
      setError(err.response?.data?.error || 'No se pudo enviar la solicitud. Intenta de nuevo.');
      // 409: otra persona tomó esa hora (o ya no está en el horario): se actualiza la agenda.
      if (err.response?.status === 409) { setInicio(''); setRecarga((n) => n + 1); }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="sv-form" onSubmit={enviar} noValidate>
      <h3>Pide tu cita</h3>

      <label className="sv-campo">
        <span>¿Qué necesitas?</span>
        <textarea
          rows={4}
          maxLength={2000}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Cuéntale al profesional qué pasa y cualquier detalle que ayude."
        />
      </label>

      <div className="sv-campo">
        <span>Día y hora</span>
        <SelectorHorario proveedorId={servicio.proveedor_id} valor={inicio} onElegir={setInicio} recarga={recarga} />
        {inicio && <p className="sv-elegida">Elegiste: <b>{fechaServicioLarga(inicio)}</b></p>}
      </div>

      <div className="sv-campo sv-campo--dir">
        <label htmlFor="sv-direccion">Dirección del servicio</label>
        <div className="sv-dir-fila">
          <input
            id="sv-direccion"
            value={direccion}
            onChange={(e) => escribirDireccion(e.target.value)}
            onBlur={() => setTimeout(() => setSugerencias([]), 200)}
            placeholder="Ej: Calle 72 #10-07, Bogotá"
            autoComplete="off"
            aria-invalid={Boolean(direccion) && Boolean(errorDireccion)}
          />
          <button type="button" className="sv-btn sv-btn--suave" onClick={usarMiUbicacion} disabled={localizando}>
            {localizando ? 'Buscando...' : 'Usar mi ubicación'}
          </button>
        </div>
        {(sugerencias.length > 0 || buscando) && (
          <ul className="sv-sugerencias">
            {buscando && <li className="sv-sug-info">Buscando direcciones...</li>}
            {sugerencias.map((s, i) => (
              <li key={i}><button type="button" onMouseDown={(e) => { e.preventDefault(); elegirSugerencia(s); }}>{s.display_name}</button></li>
            ))}
          </ul>
        )}
        {direccion && errorDireccion && <p className="sv-ayuda sv-ayuda--error">{errorDireccion}</p>}
        {!direccion && <p className="sv-ayuda">Se usa la ubicación que elegiste al buscar, si la dejaste.</p>}
      </div>

      {error && <p className="sv-error" role="alert">{error}</p>}

      <button type="submit" className="sv-btn sv-btn--principal" disabled={!puedeEnviar}>
        {enviando ? 'Enviando...' : 'Enviar solicitud'}
      </button>
      <p className="sv-ayuda sv-ayuda--centro">El profesional la acepta o la rechaza. No se cobra nada ahora.</p>
    </form>
  );
}

export default function ServicioDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [servicio, setServicio] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviadaPara, setEnviadaPara] = useState(''); // hora de la solicitud enviada

  useEffect(() => {
    setCargando(true);
    setEnviadaPara('');
    api.get(`/servicios/${id}`)
      .then((res) => setServicio(res.data))
      .catch((err) => { logError('Error al cargar servicio:', err); setServicio(null); })
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) return <div className="loading container">Cargando servicio...</div>;
  if (!servicio) return <div className="loading container">Servicio no encontrado</div>;

  const ubicacion = leerUbicacion();
  const km = ubicacion && servicio.latitud != null && servicio.longitud != null
    ? distanciaKm(ubicacion.lat, ubicacion.lng, Number(servicio.latitud), Number(servicio.longitud))
    : null;
  const esCliente = usuario?.rol === 'cliente';
  const promedio = parseFloat(servicio.calificacion_promedio || 0);

  const contenido = (
    <div className="sv">
      <Link to="/buscar" className="sv-volver">← Volver a la búsqueda</Link>

      <div className="sv-grid">
        <div className="sv-principal">
          <header className="sv-cabecera">
            <span className="sv-categoria">{servicio.categoria_nombre}</span>
            <h1>{servicio.titulo}</h1>
            <p className="sv-rating">
              <Estrellas n={promedio} />
              <b>{promedio.toFixed(1)}</b>
              <span>({servicio.total_calificaciones} {Number(servicio.total_calificaciones) === 1 ? 'calificación' : 'calificaciones'})</span>
              {km !== null && <span className="sv-distancia">{textoDistancia(km)} de ti</span>}
            </p>
          </header>

          <section>
            <h2>Descripción</h2>
            <p className="sv-texto">{servicio.descripcion || 'El profesional no agregó una descripción.'}</p>
          </section>

          <section>
            <h2>Calificaciones y comentarios</h2>
            {(!servicio.comentarios || servicio.comentarios.length === 0) ? (
              <p className="sv-texto sv-suave">Aún no hay calificaciones.</p>
            ) : (
              <ul className="sv-comentarios">
                {servicio.comentarios.map((c) => (
                  <li key={c.id}>
                    <div className="sv-com-cabecera">
                      <b>{c.nombre} {c.apellido}</b>
                      <Estrellas n={c.puntuacion} />
                    </div>
                    {c.comentario && <p>{c.comentario}</p>}
                    <small>{fechaRelativa(c.fecha_creacion)}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="sv-lateral">
          <div className="sv-tarjeta">
            <div className="sv-prov">
              <div className="sv-avatar" aria-hidden="true">{iniciales(servicio.nombre, servicio.apellido)}</div>
              <div>
                <b>{servicio.nombre} {servicio.apellido}</b>
                {servicio.telefono && <a className="sv-tel" href={`tel:${String(servicio.telefono).replace(/\s+/g, '')}`}>{servicio.telefono}</a>}
              </div>
            </div>
            {servicio.direccion && <p className="sv-dato">{servicio.direccion}</p>}
            {!servicio.direccion && !servicio.telefono && (
              <p className="sv-dato sv-suave">{usuario ? 'El contacto solo lo ven los clientes.' : 'Inicia sesión para ver el contacto.'}</p>
            )}
            <div className="sv-precio">
              <span>{TIPO_TARIFA_LARGO[servicio.tipo_tarifa] || 'Tarifa'}</span>
              <b>{formatearDinero(servicio.tarifa)}</b>
            </div>

            {enviadaPara ? (
              <div className="sv-exito" role="status">
                <b>¡Solicitud enviada!</b>
                <p>Pediste la cita para el {fechaServicioLarga(enviadaPara)} · {servicio.nombre} te responderá pronto.</p>
                <Link to="/mis-solicitudes" className="sv-btn sv-btn--principal">Ver Mis Solicitudes</Link>
              </div>
            ) : esCliente ? (
              <FormularioSolicitud servicio={servicio} onEnviada={setEnviadaPara} />
            ) : !usuario ? (
              <Link to="/login" className="sv-btn sv-btn--principal">Inicia sesión para solicitar</Link>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );

  if (usuario) {
    return <DashboardLayout titulo={servicio.titulo}>{contenido}</DashboardLayout>;
  }

  return <div className="container">{contenido}</div>;
}
