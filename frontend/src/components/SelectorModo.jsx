import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logError } from '../utils/log';
import './ModoCuenta.css';

const MODOS = [
  { id: 'cliente', etiqueta: 'Modo cliente', corta: 'Cliente' },
  { id: 'proveedor', etiqueta: 'Modo proveedor', corta: 'Proveedor' },
];

// Mensaje para el usuario según el error del servidor; nunca se muestra el texto crudo de un error de red.
function mensajeDeError(err) {
  if (err?.response?.status === 403) return 'Tu cuenta aún no está habilitada como proveedor.';
  if (err?.response?.status === 429) return 'Demasiados cambios seguidos. Espera un momento e inténtalo de nuevo.';
  if (!err?.response) return 'No pudimos conectar con el servidor. Revisa tu conexión.';
  return err.response?.data?.error || 'No se pudo cambiar de modo.';
}

// Selector "Modo cliente / Modo proveedor". Solo aparece si la cuenta puede ser proveedor (y no es administrador).
export default function SelectorModo({ onCambiado }) {
  const { usuario, cambiarModo } = useAuth();
  const navigate = useNavigate();
  const [cambiando, setCambiando] = useState(null);
  const [error, setError] = useState('');

  if (!usuario || usuario.rol === 'admin' || !usuario.esProveedor) return null;

  const elegir = async (modo) => {
    if (modo === usuario.rol || cambiando) return;
    setError('');
    setCambiando(modo);
    try {
      await cambiarModo(modo);
      onCambiado?.(modo);
      // Cada modo tiene su propio inicio; evita quedarse en una pantalla que ya no corresponde.
      navigate('/dashboard');
    } catch (err) {
      logError(err);
      setError(mensajeDeError(err));
    } finally {
      setCambiando(null);
    }
  };

  return (
    <div className="modo-selector">
      <p className="modo-titulo" id="modo-titulo">Estás usando Urbify como</p>
      <div className="modo-grupo" role="radiogroup" aria-labelledby="modo-titulo">
        {MODOS.map((m) => {
          const activo = usuario.rol === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={activo}
              className={`modo-opcion${activo ? ' is-on' : ''}`}
              disabled={Boolean(cambiando)}
              onClick={() => elegir(m.id)}
            >
              <span className="modo-largo">{m.etiqueta}</span>
              <span className="modo-corto">{m.corta}</span>
              {cambiando === m.id && <span className="modo-cargando" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {cambiando && <p className="modo-estado" role="status">Cambiando de modo…</p>}
      {error && <p className="modo-error" role="alert">{error}</p>}
    </div>
  );
}
