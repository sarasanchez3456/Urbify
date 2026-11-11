import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import PanelLateral from './PanelLateral';
import { logError } from '../utils/log';
import './CambiarContrasena.css';

// Cambiar la contraseña estando con la sesión abierta: se manda un código de 6 números al correo de la cuenta
// (mismos endpoints que "Olvidé mi contraseña"). Al terminar el servidor cierra todas las sesiones, también esta.
export default function CambiarContrasena({ correo, onCerrar }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1); // 1 = pedir código, 2 = escribir código y contraseña nueva, 3 = listo
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const codigoConLetras = codigo !== '' && /\D/.test(codigo);
  const valido = /^\d{6}$/.test(codigo) && nueva.length >= 8 && nueva.length <= 72;

  const pedirCodigo = async () => {
    setEnviando(true);
    setError('');
    try {
      await api.post('/auth/olvido-contrasena', { correo });
      setPaso(2);
    } catch (err) {
      logError('Error al pedir el código:', err);
      setError(err.response?.data?.error || 'No se pudo enviar el código. Intenta de nuevo en unos minutos.');
    } finally {
      setEnviando(false);
    }
  };

  const cambiar = async (e) => {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setError('');
    try {
      await api.post('/auth/restablecer-contrasena', { correo, codigo, nueva_contrasena: nueva });
      setPaso(3);
    } catch (err) {
      logError('Error al cambiar la contraseña:', err);
      setError(err.response?.data?.error || 'No se pudo cambiar la contraseña. Revisa el código e intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // El servidor ya cerró las sesiones: se limpia la local y se lleva al inicio de sesión.
  const irAIniciarSesion = () => { onCerrar(); logout(); navigate('/login'); };

  return (
    <PanelLateral onCerrar={paso === 3 ? irAIniciarSesion : onCerrar} etiqueta="Cambiar contraseña" ancho={460}>
      <div className="pl-cabecera">
        <div className="pl-cabecera-fila">
          <h2 className="pl-titulo">Cambiar contraseña</h2>
          <button type="button" className="pl-cerrar" onClick={paso === 3 ? irAIniciarSesion : onCerrar} aria-label="Cerrar" data-autofocus>×</button>
        </div>
      </div>

      <div className="pl-cuerpo cc">
        {paso === 1 && (
          <>
            <p>Te enviamos un código de 6 números a <b>{correo}</b> para confirmar que eres tú.</p>
            {error && <div className="pl-aviso pl-aviso--error" role="alert">{error}</div>}
          </>
        )}

        {paso === 2 && (
          <form id="cc-form" onSubmit={cambiar} noValidate className="cc-form">
            <p>Revisa tu correo (<b>{correo}</b>) y escribe el código de 6 números.</p>
            <label className="cc-campo">
              <span>Código</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className="cc-codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\s/g, ''))}
                aria-invalid={codigoConLetras}
              />
              {codigoConLetras && <small className="cc-error">El código solo tiene números. Quita las letras para poder continuar.</small>}
            </label>
            <label className="cc-campo">
              <span>Contraseña nueva</span>
              <input type="password" autoComplete="new-password" maxLength={72} value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Entre 8 y 72 caracteres" />
              {nueva !== '' && nueva.length < 8 && <small className="cc-error">Usa al menos 8 caracteres.</small>}
            </label>
            {error && <div className="pl-aviso pl-aviso--error" role="alert">{error}</div>}
          </form>
        )}

        {paso === 3 && (
          <div className="pl-aviso pl-aviso--info" role="status">
            <b>Contraseña actualizada.</b> Por seguridad se cerraron tus sesiones abiertas, incluida esta. Inicia sesión con tu contraseña nueva.
          </div>
        )}
      </div>

      <div className="pl-pie">
        {paso === 1 && <button type="button" className="pl-boton pl-boton--principal" onClick={pedirCodigo} disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar código'}</button>}
        {paso === 2 && (
          <>
            <button type="submit" form="cc-form" className="pl-boton pl-boton--principal" disabled={!valido || enviando}>{enviando ? 'Cambiando...' : 'Cambiar contraseña'}</button>
            <button type="button" className="pl-boton" onClick={pedirCodigo} disabled={enviando}>Reenviar código</button>
          </>
        )}
        {paso === 3 && <button type="button" className="pl-boton pl-boton--principal" onClick={irAIniciarSesion}>Ir a iniciar sesión</button>}
      </div>
    </PanelLateral>
  );
}
