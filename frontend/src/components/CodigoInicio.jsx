import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { logError } from '../utils/log';
import './CodigoInicio.css';

// Código de inicio del servicio (issue #57). Como el PIN de un viaje: el cliente ve el código en su solicitud
// aceptada y se lo dice al proveedor cuando llega; el proveedor lo escribe para iniciar el servicio.

// Tarjeta del CLIENTE: muestra su código, cuántos intentos le quedan al proveedor y permite generar uno nuevo.
export function TarjetaCodigoCliente({ solicitudId }) {
  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [renovando, setRenovando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const r = await api.get(`/solicitudes/${solicitudId}/codigo-inicio`);
      setDatos(r.data);
      setEstado('listo');
    } catch (err) {
      logError('Error al cargar el código de inicio:', err);
      setEstado('error');
    }
  }, [solicitudId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Si el proveedor falla un intento, llega un aviso: se vuelve a pedir el código para mostrar los intentos.
  useEffect(() => {
    window.addEventListener('notificacion_nueva', cargar);
    return () => window.removeEventListener('notificacion_nueva', cargar);
  }, [cargar]);

  const renovar = async () => {
    if (renovando) return;
    setRenovando(true);
    setError('');
    try {
      const r = await api.post(`/solicitudes/${solicitudId}/codigo-inicio`);
      setDatos(r.data);
    } catch (err) {
      logError('Error al generar un código de inicio nuevo:', err);
      setError(err.response?.data?.error || 'No se pudo generar un código nuevo. Intenta de nuevo.');
    } finally {
      setRenovando(false);
    }
  };

  if (estado === 'cargando') return null;
  if (estado === 'error') {
    return (
      <div className="ci-tarjeta" role="alert">
        <p className="ci-texto">No se pudo cargar tu código de inicio.</p>
        <button type="button" className="pl-boton" onClick={() => { setEstado('cargando'); cargar(); }}>Reintentar</button>
      </div>
    );
  }
  if (!datos?.obligatorio) return null;

  return (
    <div className={`ci-tarjeta${datos.bloqueado ? ' ci-tarjeta--bloqueada' : ''}`}>
      <h3>Código de inicio</h3>
      {datos.bloqueado ? (
        <p className="ci-texto">
          El código se bloqueó porque se escribió mal demasiadas veces. Si el profesional ya llegó, genera uno nuevo y díselo.
        </p>
      ) : (
        <>
          <p className="ci-codigo" aria-label={`Código de inicio: ${datos.codigo.split('').join(' ')}`}>
            {datos.codigo.slice(0, 3)}<span aria-hidden="true"> </span>{datos.codigo.slice(3)}
          </p>
          <p className="ci-texto">
            Díselo al profesional <b>cuando llegue</b>: lo necesita para iniciar el servicio. No lo compartas antes ni por chat.
          </p>
          {datos.intentos_restantes < 5 && (
            <p className="ci-nota">Se escribió mal {5 - datos.intentos_restantes} {5 - datos.intentos_restantes === 1 ? 'vez' : 'veces'}. Quedan {datos.intentos_restantes} intentos.</p>
          )}
        </>
      )}
      {error && <p className="pl-aviso pl-aviso--error" role="alert">{error}</p>}
      <button type="button" className={`pl-boton${datos.bloqueado ? ' pl-boton--principal' : ''}`} onClick={renovar} disabled={renovando}>
        {renovando ? 'Generando…' : 'Generar un código nuevo'}
      </button>
    </div>
  );
}

// Formulario del PROVEEDOR: escribe el código que le dice el cliente. `onIniciar(codigo)` devuelve true si se inició.
export function IniciarConCodigo({ onIniciar, onCancelar, procesando }) {
  const [codigo, setCodigo] = useState('');
  const valido = /^\d{6}$/.test(codigo);

  const enviar = async (e) => {
    e?.preventDefault();
    if (!valido || procesando) return;
    const ok = await onIniciar(codigo);
    if (!ok) setCodigo('');
  };

  return (
    <form className="ci-form" onSubmit={enviar}>
      <label htmlFor="ci-codigo-proveedor">
        <b>Código de inicio</b>
        <span>Pídele al cliente el código de 6 dígitos que ve en su solicitud.</span>
      </label>
      <input
        id="ci-codigo-proveedor"
        className="ci-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        maxLength={6}
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
        disabled={procesando}
        data-autofocus
      />
      <div className="ci-acciones">
        <button type="submit" className="pl-boton pl-boton--principal" disabled={!valido || procesando}>
          {procesando ? 'Iniciando…' : 'Iniciar servicio'}
        </button>
        <button type="button" className="pl-boton" onClick={onCancelar} disabled={procesando}>Volver</button>
      </div>
    </form>
  );
}
