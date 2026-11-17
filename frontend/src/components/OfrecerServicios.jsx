import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { logError } from '../utils/log';
import './ModoCuenta.css';

const OFICIO_MAX = 100;

function mensajeDeError(err) {
  const status = err?.response?.status;
  if (!err?.response) return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  if (status === 429) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  if (status === 403) return err.response?.data?.error || 'Tu cuenta no puede habilitarse como proveedor.';
  return err.response?.data?.error || 'No se pudo habilitar tu cuenta como proveedor.';
}

// Tarjeta de Mi Perfil: un cliente completa oficio y categoría y su cuenta queda habilitada como proveedor,
// sin cerrar sesión ni verificar el correo otra vez. Al terminar pasa a modo proveedor.
export default function OfrecerServicios() {
  const { usuario, serProveedor, cambiarModo } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [oficio, setOficio] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!abierto || categorias.length > 0) return undefined;
    let cancelado = false;
    api.get('/categorias')
      .then((r) => { if (!cancelado) setCategorias(Array.isArray(r.data) ? r.data : []); })
      .catch((e) => { logError(e); if (!cancelado) setError('No se pudieron cargar las categorías. Cierra y vuelve a abrir el formulario.'); });
    return () => { cancelado = true; };
  }, [abierto, categorias.length]);

  // Solo para clientes que todavía no son proveedores (un administrador o un proveedor no lo necesitan).
  if (!usuario || usuario.rol !== 'cliente' || usuario.esProveedor) return null;

  const oficioLimpio = oficio.trim();
  const valido = oficioLimpio.length >= 2 && oficioLimpio.length <= OFICIO_MAX && categoriaId !== '';

  // Esta tarjeta vive dentro del <form> de Mi Perfil y un formulario no puede ir dentro de otro: por eso no usa
  // <form> ni botón "submit"; Enter en el campo de oficio envía igual.
  const enviar = async () => {
    if (!valido || enviando) return;
    setError('');
    setEnviando(true);
    try {
      await serProveedor({ oficio: oficioLimpio, categoriaId });
      await cambiarModo('proveedor');
      navigate('/dashboard');
    } catch (err) {
      logError(err);
      setError(mensajeDeError(err));
      setEnviando(false);
    }
  };

  return (
    <div className="pf-card modo-oferta">
      <h3>Ofrece tus servicios</h3>
      <p className="pf-sd">
        Usa la misma cuenta para recibir solicitudes. Podrás cambiar entre modo cliente y modo proveedor cuando quieras.
      </p>

      {!abierto ? (
        <button type="button" className="modo-btn modo-btn--primario" onClick={() => setAbierto(true)}>
          Quiero ofrecer mis servicios
        </button>
      ) : (
        <div className="modo-form" role="group" aria-label="Datos para ofrecer tus servicios">
          <label className="modo-campo">
            <span>¿A qué te dedicas?</span>
            <input
              className="modo-input"
              type="text"
              value={oficio}
              maxLength={OFICIO_MAX}
              placeholder="Ej.: Plomero, electricista"
              onChange={(ev) => setOficio(ev.target.value)}
              onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); enviar(); } }}
              disabled={enviando}
              autoComplete="off"
              aria-required="true"
            />
          </label>
          <label className="modo-campo">
            <span>Categoría principal</span>
            <select
              className="modo-input"
              value={categoriaId}
              onChange={(ev) => setCategoriaId(ev.target.value)}
              disabled={enviando || categorias.length === 0}
              aria-required="true"
            >
              <option value="">{categorias.length === 0 ? 'Cargando…' : 'Elige una categoría'}</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>

          {error && <p className="modo-error" role="alert">{error}</p>}

          <div className="modo-acciones">
            <button type="button" className="modo-btn" onClick={() => { setAbierto(false); setError(''); }} disabled={enviando}>
              Cancelar
            </button>
            <button type="button" className="modo-btn modo-btn--primario" onClick={enviar} disabled={!valido || enviando}>
              {enviando ? 'Habilitando…' : 'Empezar a ofrecer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
