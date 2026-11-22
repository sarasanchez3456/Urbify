import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import PanelLateral from './PanelLateral';
import { logError } from '../utils/log';
import './CambiarContrasena.css';

// Eliminar la propia cuenta (cliente o proveedor). Pide la contraseña para confirmar que es la persona y no una sesión
// abierta en un equipo ajeno. Si tiene solicitudes abiertas el servidor no la elimina y explica por qué.
export default function EliminarCuenta({ onCerrar }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  const eliminar = async (e) => {
    e.preventDefault();
    if (!contrasena || enviando) return;
    setEnviando(true);
    setError('');
    try {
      await api.delete('/auth/perfil', { data: { contrasena } });
      setListo(true);
    } catch (err) {
      logError('Error al eliminar la cuenta:', err);
      setError(err.response?.data?.error || 'No se pudo eliminar la cuenta. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // La cuenta ya no existe: se limpia la sesión local y se vuelve al inicio.
  const salir = () => { onCerrar(); logout(); navigate('/'); };

  return (
    <PanelLateral onCerrar={listo ? salir : onCerrar} etiqueta="Eliminar cuenta" ancho={460}>
      <div className="pl-cabecera">
        <div className="pl-cabecera-fila">
          <h2 className="pl-titulo">Eliminar mi cuenta</h2>
          <button type="button" className="pl-cerrar" onClick={listo ? salir : onCerrar} aria-label="Cerrar" data-autofocus>×</button>
        </div>
      </div>

      <div className="pl-cuerpo cc">
        {!listo ? (
          <form id="ec-form" onSubmit={eliminar} noValidate className="cc-form">
            <div className="pl-aviso pl-aviso--error">
              <b>Esta acción no se puede deshacer.</b> Se cerrarán tus sesiones y se borrarán tus datos personales (nombre, correo,
              teléfono, dirección y foto). Si tienes servicios, dejarán de mostrarse. Las solicitudes ya terminadas se conservan sin
              tus datos para las otras personas que participaron en ellas.
            </div>
            <p>Si tienes solicitudes pendientes, aceptadas o en proceso, primero cancélalas o espera a que terminen.</p>
            <label className="cc-campo">
              <span>Escribe tu contraseña para confirmar</span>
              <input
                type="password"
                autoComplete="current-password"
                maxLength={128}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
              />
            </label>
            {error && <div className="pl-aviso pl-aviso--error" role="alert">{error}</div>}
          </form>
        ) : (
          <div className="pl-aviso pl-aviso--info" role="status">
            <b>Tu cuenta fue eliminada.</b> Gracias por haber usado Urbify.
          </div>
        )}
      </div>

      <div className="pl-pie">
        {!listo ? (
          <>
            <button type="submit" form="ec-form" className="pl-boton pl-boton--peligro" disabled={!contrasena || enviando}>
              {enviando ? 'Eliminando...' : 'Eliminar mi cuenta'}
            </button>
            <button type="button" className="pl-boton" onClick={onCerrar} disabled={enviando}>Cancelar</button>
          </>
        ) : (
          <button type="button" className="pl-boton pl-boton--principal" onClick={salir}>Ir al inicio</button>
        )}
      </div>
    </PanelLateral>
  );
}
