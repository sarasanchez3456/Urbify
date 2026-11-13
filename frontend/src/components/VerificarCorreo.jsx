import { useState, useEffect, useRef, useCallback } from 'react';
import { MailCheck, KeyRound, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { logError } from '../utils/log';

// Verificación de correo con un código de 6 caracteres (letras MAYÚSCULAS y números), con las rutas del backend:
//   POST /auth/verificar-correo  { correo, codigo }  → activa la cuenta e inicia la sesión
//   POST /auth/reenviar-codigo   { correo }          → envía un código nuevo (el anterior deja de servir)
// Reglas del servidor: el código vence a los 10 minutos, sirve una sola vez y se bloquea tras 5 intentos fallidos;
// entre un envío y otro hay que esperar 1 minuto. El servidor responde igual exista o no el correo, y esta pantalla
// tampoco lo revela. El código se muestra siempre en mayúsculas; aunque llegue en minúsculas el backend lo normaliza.

const LONGITUD_CODIGO = 6;
const ESPERA_REENVIO_SEG = 60;

// "maria.lopez@gmail.com" -> "m***@gmail.com": se confirma a qué correo se envió sin exponerlo entero en pantalla.
const enmascarar = (correo) => {
  const [usuario = '', dominio = ''] = String(correo).split('@');
  return `${usuario.slice(0, 1)}***@${dominio}`;
};

export default function VerificarCorreo({ correo, enviarAlAbrir = false, onVolver, onVerificado }) {
  const { verificarCorreo } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(enviarAlAbrir ? '' : 'Te enviamos un código de verificación.');
  const [espera, setEspera] = useState(enviarAlAbrir ? 0 : ESPERA_REENVIO_SEG);
  const abrio = useRef(false);

  const codigoCompleto = codigo.length === LONGITUD_CODIGO;

  // Cuenta regresiva del botón "Enviar otro código".
  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const pedirCodigo = useCallback(async () => {
    setEnviando(true);
    setError('');
    try {
      await api.post('/auth/reenviar-codigo', { correo });
      setInfo('Te enviamos un código nuevo. El anterior ya no sirve.');
      setCodigo('');
      setEspera(ESPERA_REENVIO_SEG);
    } catch (err) {
      logError('Error al reenviar el código de verificación:', err);
      setError(err.response?.data?.error || 'No se pudo enviar el código. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }, [correo]);

  // Cuenta creada pero sin verificar (se llega desde el inicio de sesión): se envía un código al abrir esta pantalla.
  useEffect(() => {
    if (!enviarAlAbrir || abrio.current) return;
    abrio.current = true;
    pedirCodigo();
  }, [enviarAlAbrir, pedirCodigo]);

  // Mayúsculas siempre; sin espacios ni guiones (se pueden pegar con ellos); solo letras y números.
  const alEscribir = (e) => {
    const limpio = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LONGITUD_CODIGO);
    setCodigo(limpio);
    setError('');
  };

  const handleVerificar = async (e) => {
    e.preventDefault();
    if (!codigoCompleto || enviando) return;
    setEnviando(true);
    setError('');
    setInfo('');
    try {
      const usuario = await verificarCorreo(correo, codigo);
      onVerificado(usuario);
    } catch (err) {
      logError('Error al verificar el correo:', err);
      setError(err.response?.data?.error || 'No se pudo verificar el código. Intenta de nuevo.');
      setEnviando(false);
    }
  };

  return (
    <div className="auth-recovery">
      <button type="button" className="auth-link auth-back" onClick={onVolver}>← Volver</button>

      <div className="auth-form-header">
        <h2>Verifica tu correo</h2>
        <p>
          Te enviamos un código de {LONGITUD_CODIGO} caracteres a <strong>{enmascarar(correo)}</strong>.
          Escríbelo aquí para activar tu cuenta. Vence en 10 minutos. Si no lo ves, revisa el correo no deseado.
        </p>
      </div>

      {info && <div className="auth-alert auth-alert-ok" role="status"><span>{info}</span></div>}
      {error && <div className="auth-alert auth-alert-error" role="alert"><span>{error}</span></div>}

      <form onSubmit={handleVerificar} className="auth-form" noValidate>
        <div className="auth-field auth-code">
          <label htmlFor="ver_codigo"><KeyRound size={14} /> Código de verificación</label>
          <input
            id="ver_codigo"
            autoFocus
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={LONGITUD_CODIGO + 2}
            placeholder="······"
            value={codigo}
            onChange={alEscribir}
            style={{ textTransform: 'uppercase' }}
            aria-describedby="ver_ayuda"
            required
          />
          <p className="auth-hint" id="ver_ayuda">Letras en mayúscula y números. No usamos 0, 1, O, I ni L para evitar confusiones.</p>
        </div>

        <button className="auth-submit" type="submit" disabled={!codigoCompleto || enviando}>
          {enviando ? 'Verificando...' : 'Verificar y entrar'}
          <MailCheck size={16} />
          <ArrowRight size={16} />
        </button>

        <p className="auth-switch">
          ¿No llegó?{' '}
          <button type="button" className="auth-link" onClick={pedirCodigo} disabled={enviando || espera > 0}>
            {espera > 0 ? `Enviar otro código (${espera} s)` : 'Enviar otro código'}
          </button>
        </p>
      </form>
    </div>
  );
}
