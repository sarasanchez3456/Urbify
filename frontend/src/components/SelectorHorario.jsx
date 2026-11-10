import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';
import { horaMensaje } from '../utils/solicitudes';
import { logError } from '../utils/log';
import './SelectorHorario.css';

const DIAS_VISIBLES = 14;

// "mié 11" a partir de "2026-11-11" (la fecha ya viene en hora de Colombia, se formatea sin zona).
function etiquetaDiaAgenda(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  const texto = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
  return texto.replace(/\./g, '');
}

// Día y hora con las horas REALES del profesional (GET /proveedores/:id/agenda): las ocupadas, las que están fuera de
// su horario y las que ya pasaron no se pueden elegir. `valor` es el inicio (ISO) elegido; `onElegir(inicio)` avisa
// del cambio. Cambiar `recarga` (un número) vuelve a pedir la agenda, por ejemplo cuando el servidor dice que la
// hora elegida ya fue tomada. `solicitudId` se usa al reprogramar: esa cita no cuenta como ocupada.
export default function SelectorHorario({ proveedorId, solicitudId, valor, onElegir, recarga = 0, soloLectura = false }) {
  const [agenda, setAgenda] = useState(null); // null = cargando
  const [error, setError] = useState('');
  const [diaElegido, setDiaElegido] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await api.get(`/proveedores/${proveedorId}/agenda`, {
        params: { dias: DIAS_VISIBLES, ...(solicitudId ? { solicitud_id: solicitudId } : {}) },
      });
      setAgenda(res.data);
      setError('');
    } catch (err) {
      logError('Error al cargar la agenda del profesional:', err);
      setError(err.response?.data?.error || 'No se pudo cargar la agenda del profesional.');
    }
  }, [proveedorId, solicitudId]);

  useEffect(() => { cargar(); }, [cargar, recarga]);

  // Solo se listan los días con horas; si el proveedor no atiende ese día no aparece.
  const dias = useMemo(() => (agenda?.dias || []).filter((d) => d.horas.length > 0), [agenda]);
  const libres = (d) => d.horas.filter((h) => h.estado === 'libre' && !h.actual).length;

  // Al cargar, se deja seleccionado el primer día con horas libres.
  useEffect(() => {
    if (!agenda) return;
    if (!dias.some((d) => d.fecha === diaElegido)) setDiaElegido((dias.find((d) => libres(d) > 0) || dias[0] || {}).fecha || '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agenda]);

  const dia = dias.find((d) => d.fecha === diaElegido);
  const hayLibres = dias.some((d) => libres(d) > 0);

  return (
    <div className="sh">
      {agenda === null && !error && <p className="sh-vacio">Cargando horas disponibles...</p>}
      {error && <p className="sh-error" role="alert">{error}</p>}
      {agenda && !hayLibres && (
        <p className="sh-aviso">No hay horas libres en los próximos {DIAS_VISIBLES} días. Escríbele al profesional para acordar otra fecha.</p>
      )}

      {agenda && dias.length > 0 && (
        <>
          <div className="sh-dias" role="tablist" aria-label="Días">
            {dias.map((d) => (
              <button
                key={d.fecha}
                type="button"
                role="tab"
                aria-selected={d.fecha === diaElegido}
                className={`sh-dia${d.fecha === diaElegido ? ' is-on' : ''}`}
                onClick={() => setDiaElegido(d.fecha)}
              >
                <span>{etiquetaDiaAgenda(d.fecha)}</span>
                <small>{libres(d) > 0 ? `${libres(d)} libres` : 'sin horas'}</small>
              </button>
            ))}
          </div>

          {dia && (
            <div className="sh-horas" role="group" aria-label="Horas del día">
              {dia.horas.map((h) => {
                const libre = h.estado === 'libre';
                const seleccionada = h.inicio === valor;
                return (
                  <button
                    key={h.inicio}
                    type="button"
                    disabled={!libre || h.actual || soloLectura}
                    aria-pressed={seleccionada}
                    className={`sh-hora${seleccionada ? ' is-on' : ''}${h.actual ? ' is-actual' : ''}${!libre ? ' is-ocupada' : ''}`}
                    onClick={() => onElegir(h.inicio)}
                    title={h.actual ? 'Tu cita actual' : h.estado === 'ocupado' ? 'Ya está tomada' : h.estado === 'pasado' ? 'Ya pasó' : undefined}
                  >
                    {horaMensaje(h.inicio)}
                    {h.actual && <small>actual</small>}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
