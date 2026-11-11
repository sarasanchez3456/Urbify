import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import { formatearDinero, fechaServicioCorta, TIPO_TARIFA } from '../utils/solicitudes';
import { logError } from '../utils/log';
import './Ingresos.css';

const ZONA = 'America/Bogota';
const claveMes = (iso) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: ZONA }).format(new Date(iso)); // AAAA-MM
const nombreMes = (clave) => {
  const [y, m] = clave.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1))).replace('.', '');
};
const nombreMesLargo = (clave) => {
  const [y, m] = clave.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
};

// Billetera del proveedor: lo que ha ganado con los servicios completados (igual que la de la app móvil: suma de las
// tarifas acordadas de las solicitudes completadas). Las tarifas por hora cuentan como una hora; el total real
// puede variar según las horas trabajadas.
export default function Ingresos() {
  const [completadas, setCompletadas] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/solicitudes/proveedor');
      const lista = (Array.isArray(res.data) ? res.data : []).filter((s) => s.estado === 'completada');
      lista.sort((a, b) => new Date(b.fecha_servicio || b.fecha_solicitud) - new Date(a.fecha_servicio || a.fecha_solicitud));
      setCompletadas(lista);
      setError('');
    } catch (err) {
      logError('Error al cargar los ingresos:', err);
      setError('No se pudieron cargar tus ingresos.');
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const datos = useMemo(() => {
    if (!completadas) return null;
    const fechaDe = (s) => s.fecha_servicio || s.fecha_solicitud;
    const total = completadas.reduce((t, s) => t + Number(s.tarifa || 0), 0);
    const porMes = new Map();
    for (const s of completadas) {
      const k = claveMes(fechaDe(s));
      porMes.set(k, (porMes.get(k) || 0) + Number(s.tarifa || 0));
    }
    // Últimos 6 meses (incluido el actual), aunque algunos no tengan ingresos.
    const meses = [];
    const hoy = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1, 12));
      const k = claveMes(d.toISOString());
      meses.push({ clave: k, valor: porMes.get(k) || 0 });
    }
    const mesActual = meses[meses.length - 1];
    return { total, meses, mesActual, max: Math.max(1, ...meses.map((m) => m.valor)) };
  }, [completadas]);

  return (
    <DashboardLayout titulo="Billetera" subtitulo="Lo que has ganado con tus servicios">
      <div className="ig">
        {error && <div className="ig-tarjeta ig-vacio" role="alert"><p>{error}</p><button type="button" className="ig-btn" onClick={cargar}>Reintentar</button></div>}
        {!completadas && !error && <div className="ig-tarjeta ig-vacio">Cargando...</div>}

        {datos && (
          <>
            <div className="ig-hero">
              <span>Ingresos totales</span>
              <b>{formatearDinero(datos.total)}</b>
              <small>{completadas.length} {completadas.length === 1 ? 'trabajo completado' : 'trabajos completados'} · {nombreMesLargo(datos.mesActual.clave)}: {formatearDinero(datos.mesActual.valor)}</small>
            </div>

            <div className="ig-tarjeta">
              <h2>Últimos 6 meses</h2>
              <div className="ig-barras" role="img" aria-label={`Ingresos por mes: ${datos.meses.map((m) => `${nombreMes(m.clave)} ${formatearDinero(m.valor)}`).join(', ')}`}>
                {datos.meses.map((m) => (
                  <div className="ig-barra" key={m.clave}>
                    <span className="ig-valor">{m.valor > 0 ? formatearDinero(m.valor) : ''}</span>
                    <i style={{ height: `${Math.max(m.valor > 0 ? 6 : 2, (m.valor / datos.max) * 100)}%` }} className={m.valor > 0 ? '' : 'is-vacia'} />
                    <small>{nombreMes(m.clave)}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="ig-tarjeta">
              <h2>Historial</h2>
              {completadas.length === 0 ? (
                <p className="ig-suave">Todavía no tienes trabajos completados. Cuando termines uno, aparecerá aquí.</p>
              ) : (
                <ul className="ig-lista">
                  {completadas.map((s) => (
                    <li key={s.id}>
                      <div>
                        <b>{s.servicio_titulo}</b>
                        <small>{`${s.cliente_nombre || ''} ${s.cliente_apellido || ''}`.trim() || 'Cliente'} · {fechaServicioCorta(s.fecha_servicio || s.fecha_solicitud)}</small>
                      </div>
                      <span className="ig-monto">{formatearDinero(s.tarifa)}{TIPO_TARIFA[s.tipo_tarifa_acordada] && <small>{TIPO_TARIFA[s.tipo_tarifa_acordada]}</small>}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="ig-nota">Las tarifas por hora se cuentan como una hora; si trabajaste más, tu ingreso real puede ser mayor.</p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
