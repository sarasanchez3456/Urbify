import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import api from '../api/axios';
import { logError } from '../utils/log';

const MAX_CARACTERES = 1000;
const REFRESCO_MS = 5000;

// Chat de una solicitud entre su cliente y su proveedor (GET/POST /api/solicitudes/:id/mensajes).
// Se refresca solo cada pocos segundos mientras está abierto.
export default function ChatSolicitud({ solicitud, otraParte, onCerrar }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const finRef = useRef(null);
  const ultimaCantidad = useRef(0);

  const cargar = async () => {
    try {
      const res = await api.get(`/solicitudes/${solicitud.id}/mensajes`);
      setMensajes(res.data);
      setError('');
    } catch (err) {
      logError('Error al cargar los mensajes:', err);
      setError(err.response?.data?.error || 'No se pudieron cargar los mensajes');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    const timer = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitud.id]);

  // Baja al último mensaje solo cuando llegan mensajes nuevos.
  useEffect(() => {
    if (mensajes.length !== ultimaCantidad.current) {
      ultimaCantidad.current = mensajes.length;
      finRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes]);

  useEffect(() => {
    const alPulsarEsc = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alPulsarEsc);
    return () => window.removeEventListener('keydown', alPulsarEsc);
  }, [onCerrar]);

  const enviar = async (e) => {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido || enviando) return;
    setEnviando(true);
    setError('');
    try {
      await api.post(`/solicitudes/${solicitud.id}/mensajes`, { contenido });
      setTexto('');
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar el mensaje');
    } finally {
      setEnviando(false);
    }
  };

  const hora = (valor) => {
    const f = new Date(valor);
    return Number.isNaN(f.getTime()) ? '' : f.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Chat de la solicitud ${solicitud.servicio_titulo}`}
    >
      <div
        className="w-full sm:max-w-lg flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#fff', height: 'min(80vh, 640px)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold truncate" style={{ color: 'oklch(0.25 0.06 240)' }}>
              <MessageCircle size={16} style={{ color: 'oklch(0.40 0.18 255)' }} />
              {solicitud.servicio_titulo}
            </p>
            <p className="text-xs truncate" style={{ color: 'oklch(0.45 0.03 240)' }}>Chat con {otraParte}</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar el chat"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'oklch(0.45 0.03 240)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
          {cargando ? (
            <p className="text-sm text-center py-8" style={{ color: 'oklch(0.45 0.03 240)' }}>Cargando mensajes...</p>
          ) : mensajes.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'oklch(0.45 0.03 240)' }}>
              Aún no hay mensajes. Escribe el primero para coordinar el servicio.
            </p>
          ) : (
            mensajes.map((m) => {
              const propio = Boolean(m.es_propio);
              return (
                <div key={m.id} className={`flex ${propio ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[80%] rounded-2xl px-3.5 py-2"
                    style={propio
                      ? { color: 'white', background: 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)', borderBottomRightRadius: 4 }
                      : { color: 'oklch(0.25 0.06 240)', backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderBottomLeftRadius: 4 }}
                  >
                    {!propio && <p className="text-xs font-semibold mb-0.5" style={{ color: 'oklch(0.40 0.18 255)' }}>{m.remitente_nombre}</p>}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.contenido}</p>
                    <p className="text-[10px] mt-1 text-right" style={{ opacity: 0.7 }}>{hora(m.fecha_envio)}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={finRef} />
        </div>

        {error && (
          <p className="px-5 py-2 text-xs" style={{ color: '#dc2626', backgroundColor: 'rgba(239,68,68,0.08)' }} role="alert">{error}</p>
        )}

        <form onSubmit={enviar} className="flex items-end gap-2 px-4 py-3" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <textarea
            rows="1"
            value={texto}
            maxLength={MAX_CARACTERES}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) enviar(e); }}
            placeholder="Escribe un mensaje..."
            aria-label="Mensaje"
            className="flex-1 resize-none px-3.5 py-2.5 rounded-xl text-sm max-h-28"
            style={{ backgroundColor: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', outline: 'none', color: 'oklch(0.25 0.06 240)' }}
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando}
            aria-label="Enviar mensaje"
            className="p-3 rounded-xl transition-opacity"
            style={{ color: 'white', background: 'linear-gradient(135deg, oklch(0.40 0.18 255), #1e4f43)', opacity: !texto.trim() || enviando ? 0.5 : 1 }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
