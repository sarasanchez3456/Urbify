import { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Lock, KeyRound, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import { logError } from '../utils/log';

// Recuperación de contraseña en tres pasos, con las rutas que ya tiene el backend:
//   1) POST /auth/olvido-contrasena       { correo }                              → envía un código de 6 dígitos al correo
//   2) POST /auth/restablecer-contrasena  { correo, codigo, nueva_contrasena }    → cambia la contraseña
//   3) confirmación
// Reglas del servidor (docs/RUTAS_MOVIL.md): el código vence a los 15 minutos, sirve una sola vez y se
// invalida tras 5 intentos fallidos; la contraseña nueva tiene de 8 a 72 caracteres.
// El servidor responde igual exista o no la cuenta: esta pantalla tampoco revela si un correo está registrado.

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

export default function RecuperarContrasena({ correoInicial = '', onVolver, onTerminar }) {
  const [paso, setPaso] = useState(1); // 1 = pedir código, 2 = escribir código y contraseña nueva, 3 = listo
  const [correo, setCorreo] = useState(correoInicial);
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [mensajeFinal, setMensajeFinal] = useState('');
  const [avisoCodigo, setAvisoCodigo] = useState('');
  const codigoRef = useRef(null);
  const temporizadorAviso = useRef(null);

  const correoLimpio = correo.trim();
  const correoValido = EMAIL_VALIDO.test(correoLimpio);
  const codigoConLetras = /\D/.test(codigo);
  const codigoCompleto = /^\d{6}$/.test(codigo);
  const passwordValida = nueva.length >= PASSWORD_MIN && nueva.length <= PASSWORD_MAX;

  // El código solo tiene números: las letras no aparecen al teclear. Se usa el evento nativo "beforeinput"
  // porque también se dispara con teclados móviles. Si llegan por otra vía (pegar), queda a la vista con su
  // error y el botón se apaga.
  const avisarSoloNumeros = useCallback(() => {
    setAvisoCodigo('Este campo solo acepta números.');
    clearTimeout(temporizadorAviso.current);
    temporizadorAviso.current = setTimeout(() => setAvisoCodigo(''), 1600);
  }, []);

  useEffect(() => {
    const campo = codigoRef.current;
    if (!campo) return undefined;
    const alEscribir = (e) => {
      if (e.inputType === 'insertText' && e.data && /\D/.test(e.data)) {
        e.preventDefault();
        avisarSoloNumeros();
      }
    };
    campo.addEventListener('beforeinput', alEscribir);
    return () => campo.removeEventListener('beforeinput', alEscribir);
  }, [paso, avisarSoloNumeros]);

  useEffect(() => () => clearTimeout(temporizadorAviso.current), []);

  const pedirCodigo = async () => {
    await api.post('/auth/olvido-contrasena', { correo: correoLimpio });
  };

  const handlePedirCodigo = async (e) => {
    e.preventDefault();
    if (!correoValido || enviando) return;
    setEnviando(true);
    setError('');
    try {
      await pedirCodigo();
      setInfo('');
      setPaso(2);
    } catch (err) {
      logError('Error al pedir el código de recuperación:', err);
      setError(err.response?.data?.error || 'No se pudo enviar el código. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const handleReenviar = async () => {
    if (enviando) return;
    setEnviando(true);
    setError('');
    setInfo('');
    try {
      await pedirCodigo();
      setCodigo('');
      setInfo('Te enviamos un código nuevo. El anterior ya no sirve.');
    } catch (err) {
      logError('Error al reenviar el código de recuperación:', err);
      setError(err.response?.data?.error || 'No se pudo enviar otro código. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const handleRestablecer = async (e) => {
    e.preventDefault();
    if (!codigoCompleto || !passwordValida || enviando) return;
    setEnviando(true);
    setError('');
    setInfo('');
    try {
      const res = await api.post('/auth/restablecer-contrasena', {
        correo: correoLimpio,
        codigo,
        nueva_contrasena: nueva,
      });
      setMensajeFinal(res.data?.mensaje || 'Contraseña actualizada. Inicia sesión con la nueva contraseña.');
      setNueva('');
      setCodigo('');
      setPaso(3);
    } catch (err) {
      logError('Error al restablecer la contraseña:', err);
      setError(err.response?.data?.error || 'No se pudo cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const textoErrorCodigo = codigoConLetras
    ? 'El código solo tiene números. Quita las letras para poder continuar.'
    : avisoCodigo;

  return (
    <div className="auth-recovery">
      {paso !== 3 && (
        <button type="button" className="auth-link auth-back" onClick={paso === 2 ? () => { setPaso(1); setError(''); setInfo(''); } : onVolver}>
          {paso === 2 ? '← Cambiar correo' : '← Volver a iniciar sesión'}
        </button>
      )}

      {paso === 1 && (
        <>
          <div className="auth-form-header">
            <h2>Recupera tu contraseña</h2>
            <p>Escribe tu correo y te enviamos un código de 6 números.</p>
          </div>

          {error && <div className="auth-alert auth-alert-error" role="alert"><span>{error}</span></div>}

          <form onSubmit={handlePedirCodigo} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="rec_email"><Mail size={14} /> Correo electrónico</label>
              <input
                id="rec_email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={correo}
                onChange={(e) => { setCorreo(e.target.value); setError(''); }}
                required
              />
            </div>
            <button className="auth-submit" type="submit" disabled={!correoValido || enviando}>
              {enviando ? 'Enviando...' : 'Enviar código'}
              <ArrowRight size={16} />
            </button>
          </form>
        </>
      )}

      {paso === 2 && (
        <>
          <div className="auth-form-header">
            <h2>Revisa tu correo</h2>
            <p>
              Si <strong>{correoLimpio}</strong> está registrado, te enviamos un código de 6 números.
              Vence en 15 minutos y solo sirve una vez.
            </p>
          </div>

          {info && <div className="auth-alert auth-alert-ok" role="status"><span>{info}</span></div>}
          {error && <div className="auth-alert auth-alert-error" role="alert"><span>{error}</span></div>}

          <form onSubmit={handleRestablecer} className="auth-form" noValidate>
            <div className="auth-field auth-code">
              <label htmlFor="rec_codigo"><KeyRound size={14} /> Código</label>
              <input
                id="rec_codigo"
                ref={codigoRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="······"
                value={codigo}
                onChange={(e) => { setCodigo(e.target.value); setError(''); }}
                aria-invalid={Boolean(textoErrorCodigo)}
                aria-describedby={textoErrorCodigo ? 'rec_codigo_err' : undefined}
                required
              />
              {textoErrorCodigo && <p className="auth-field-error" id="rec_codigo_err">{textoErrorCodigo}</p>}
            </div>

            <div className="auth-field">
              <label htmlFor="rec_password"><Lock size={14} /> Contraseña nueva</label>
              <input
                id="rec_password"
                type="password"
                autoComplete="new-password"
                placeholder="Entre 8 y 72 caracteres"
                minLength={PASSWORD_MIN}
                maxLength={PASSWORD_MAX}
                value={nueva}
                onChange={(e) => { setNueva(e.target.value); setError(''); }}
                required
              />
              <p className="auth-hint">Entre 8 y 72 caracteres.</p>
            </div>

            <button className="auth-submit" type="submit" disabled={!codigoCompleto || !passwordValida || enviando}>
              {enviando ? 'Cambiando...' : 'Cambiar contraseña'}
              <ArrowRight size={16} />
            </button>

            <p className="auth-switch">
              ¿No llegó?{' '}
              <button type="button" className="auth-link" onClick={handleReenviar} disabled={enviando}>
                Enviar otro código
              </button>
            </p>
          </form>
        </>
      )}

      {paso === 3 && (
        <>
          <div className="auth-form-header">
            <h2>Contraseña actualizada</h2>
          </div>
          <div className="auth-alert auth-alert-ok" role="status"><span>{mensajeFinal}</span></div>
          <button className="auth-submit" type="button" onClick={() => onTerminar(correoLimpio)}>
            Iniciar sesión
            <ArrowRight size={16} />
          </button>
        </>
      )}
    </div>
  );
}
