import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import { fechaHoraCorta } from '../utils/solicitudes';
import { logError } from '../utils/log';
import './Verificacion.css';

const MAX_BYTES = 4 * 1024 * 1024;
const TIPOS_ARCHIVO = ['image/jpeg', 'image/png', 'application/pdf'];
const DOCUMENTOS = [
  { tipo: 'cedula', titulo: 'Cédula de ciudadanía', ayuda: 'Foto o escaneo de ambos lados, con todo el texto legible.', aceptaPdf: true },
  { tipo: 'certificado', titulo: 'Certificado de tu oficio', ayuda: 'Un curso, certificación o carta de un cliente que respalde tu trabajo.', aceptaPdf: true },
  { tipo: 'foto', titulo: 'Foto tuya', ayuda: 'Una foto clara de tu cara, sin lentes oscuros, para que los clientes te reconozcan.', aceptaPdf: false },
];

export default function Verificacion() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(''); // tipo que se está subiendo, 'iniciar' o 'enviar'
  const [avisoDoc, setAvisoDoc] = useState({});
  const entradas = useRef({});

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/verificaciones/mia');
      setDatos(res.data);
      setError('');
    } catch (err) {
      logError('Error al cargar la verificación:', err);
      setError(err.response?.data?.error || 'No se pudo cargar tu verificación.');
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (clave, fn) => {
    setOcupado(clave);
    setError('');
    try {
      const res = await fn();
      setDatos(res.data);
    } catch (err) {
      logError('Error en la verificación:', err);
      setError(err.response?.data?.error || 'No se pudo completar la acción. Intenta de nuevo.');
    } finally {
      setOcupado('');
    }
  };

  const subir = async (doc, archivo) => {
    if (!archivo) return;
    const permitidos = doc.aceptaPdf ? TIPOS_ARCHIVO : TIPOS_ARCHIVO.slice(0, 2);
    let problema = '';
    if (!permitidos.includes(archivo.type)) problema = doc.aceptaPdf ? 'Usa una imagen JPG, PNG o un PDF.' : 'Usa una imagen JPG o PNG.';
    else if (archivo.size > MAX_BYTES) problema = 'El archivo pesa más de 4 MB.';
    setAvisoDoc((a) => ({ ...a, [doc.tipo]: problema }));
    if (problema) return;
    await accion(doc.tipo, () => api.put(`/verificaciones/mia/documentos/${doc.tipo}`, archivo, { headers: { 'Content-Type': archivo.type } }));
  };

  const estado = datos?.estado;
  const subidos = new Set((datos?.documentos || []).map((d) => d.tipo));
  const completo = DOCUMENTOS.every((d) => subidos.has(d.tipo));

  return (
    <DashboardLayout titulo="Verificación" subtitulo="Genera confianza con tus clientes">
      <div className="vf">
        {error && !datos && <div className="vf-tarjeta vf-centro" role="alert"><p>{error}</p><button type="button" className="vf-btn" onClick={cargar}>Reintentar</button></div>}
        {!datos && !error && <div className="vf-tarjeta vf-centro">Cargando...</div>}

        {datos && datos.verificado && (
          <div className="vf-tarjeta vf-exito">
            <span className="vf-sello" aria-hidden="true">✓</span>
            <div>
              <h2>Tu cuenta está verificada</h2>
              <p>Los clientes ven la insignia “Verificado” junto a tu nombre en las búsquedas y en tus servicios.</p>
            </div>
          </div>
        )}

        {datos && !datos.verificado && (
          <>
            <div className="vf-tarjeta">
              <h2>Verifica tu cuenta</h2>
              <p className="vf-suave">Un administrador revisa tu cédula, un certificado de tu oficio y tu foto. Si todo está bien, tu perfil muestra la insignia “Verificado”. Los documentos solo los ve la administración de Urbify y no se muestran a los clientes.</p>
            </div>

            {estado === 'pendiente' && (
              <div className="vf-tarjeta vf-pendiente" role="status">
                <h2>En revisión</h2>
                <p>Enviaste tus documentos{datos.fecha_envio ? ` (${fechaHoraCorta(datos.fecha_envio)})` : ''}. Te avisaremos con una notificación cuando tengamos una respuesta.</p>
              </div>
            )}

            {estado === 'rechazada' && (
              <div className="vf-tarjeta vf-rechazo" role="alert">
                <h2>Tu verificación no fue aprobada</h2>
                <p><b>Motivo:</b> {datos.motivo_rechazo}</p>
                <button type="button" className="vf-btn vf-btn--principal" disabled={ocupado === 'iniciar'} onClick={() => accion('iniciar', () => api.post('/verificaciones/mia'))}>Volver a intentarlo</button>
              </div>
            )}

            {!estado && (
              <div className="vf-tarjeta vf-centro">
                <p>Necesitarás tener a mano tu cédula, un certificado de tu oficio y una foto.</p>
                <button type="button" className="vf-btn vf-btn--principal" disabled={ocupado === 'iniciar'} onClick={() => accion('iniciar', () => api.post('/verificaciones/mia'))}>Empezar verificación</button>
              </div>
            )}

            {estado === 'borrador' && (
              <div className="vf-tarjeta">
                <h2>Sube tus documentos</h2>
                <p className="vf-suave">JPG, PNG o PDF, de hasta 4 MB cada uno.</p>
                <ul className="vf-docs">
                  {DOCUMENTOS.map((d) => {
                    const listo = subidos.has(d.tipo);
                    return (
                      <li key={d.tipo} className={listo ? 'is-listo' : ''}>
                        <span className="vf-estado" aria-hidden="true">{listo ? '✓' : ''}</span>
                        <div>
                          <b>{d.titulo}</b>
                          <small>{d.ayuda}</small>
                          {avisoDoc[d.tipo] && <small className="vf-problema" role="alert">{avisoDoc[d.tipo]}</small>}
                        </div>
                        <input
                          ref={(el) => { entradas.current[d.tipo] = el; }}
                          type="file"
                          className="vf-archivo"
                          accept={d.aceptaPdf ? 'image/jpeg,image/png,application/pdf' : 'image/jpeg,image/png'}
                          aria-label={`Elegir archivo: ${d.titulo}`}
                          onChange={(e) => { subir(d, e.target.files?.[0]); e.target.value = ''; }}
                        />
                        <button type="button" className="vf-btn" disabled={Boolean(ocupado)} onClick={() => entradas.current[d.tipo]?.click()}>
                          {ocupado === d.tipo ? 'Subiendo...' : listo ? 'Cambiar' : 'Elegir archivo'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {error && <div className="vf-error" role="alert">{error}</div>}
                <button type="button" className="vf-btn vf-btn--principal" disabled={!completo || Boolean(ocupado)} onClick={() => accion('enviar', () => api.post('/verificaciones/mia/enviar'))}>
                  {ocupado === 'enviar' ? 'Enviando...' : 'Enviar a revisión'}
                </button>
                {!completo && <p className="vf-suave">Sube los tres documentos para poder enviarlos.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
