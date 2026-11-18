import { useEffect, useRef, useState } from 'react';
import { geocodificarDireccion, coordenadasADireccion, estaDentroDeColombia } from '../utils/colombia';
import './CampoDireccion.css';

// Campo de dirección con reglas claras: se escribe "calle, barrio y ciudad" y se ELIGE una opción de la lista.
// Al elegirla se guardan las coordenadas (para el mapa) y se muestra en qué ciudad quedó ubicada, así nadie termina
// "en Bogotá" sin saberlo. Mientras no se elija, la dirección figura como "sin confirmar".
//
// Props:
//  - value / onTexto(texto): el texto de la dirección.
//  - onUbicacion({ lat, lng } | null): se llama al elegir una opción (con las coordenadas) o al escribir de nuevo (null).
//  - lat / lng: coordenadas ya guardadas (si existen, la dirección se considera confirmada y se muestra su ciudad).
//  - id, className: del input.
function ciudadDe(item) {
  const a = item?.address || {};
  return a.city || a.town || a.village || a.municipality || a.county || '';
}

export default function CampoDireccion({ id, value, onTexto, onUbicacion, lat, lng, className = '', placeholder, requerida = false, ...resto }) {
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [sinResultados, setSinResultados] = useState(false);
  const [lugar, setLugar] = useState(''); // ciudad/zona donde quedó ubicada
  const [confirmada, setConfirmada] = useState(lat != null && lng != null);
  const temporizador = useRef(null);
  const guardadaRef = useRef(`${lat}|${lng}`);

  // Coordenadas que ya vienen del perfil: se pregunta al mapa en qué ciudad están, para mostrarla.
  useEffect(() => {
    guardadaRef.current = `${lat}|${lng}`;
    if (lat == null || lng == null) { setConfirmada(false); return undefined; }
    setConfirmada(true);
    let vigente = true;
    coordenadasADireccion(lat, lng).then((t) => { if (vigente && t) setLugar(t.split(',').slice(-2).join(',').trim()); }).catch(() => {});
    return () => { vigente = false; };
  }, [lat, lng]);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const escribir = (texto) => {
    onTexto(texto);
    setConfirmada(false);
    setLugar('');
    onUbicacion?.(null);
    clearTimeout(temporizador.current);
    if (texto.trim().length < 5) { setSugerencias([]); setBuscando(false); setSinResultados(false); return; }
    setBuscando(true);
    temporizador.current = setTimeout(async () => {
      const r = await geocodificarDireccion(texto).catch(() => []);
      const validas = r.filter((x) => estaDentroDeColombia(x.lat, x.lon));
      setSugerencias(validas);
      setSinResultados(validas.length === 0);
      setBuscando(false);
    }, 500);
  };

  const elegir = (s) => {
    const corto = s.display_name.split(',').slice(0, 3).join(',').trim();
    onTexto(corto);
    onUbicacion?.({ lat: s.lat, lng: s.lon });
    setLugar([ciudadDe(s), s.address?.state].filter(Boolean).join(', ') || s.display_name.split(',').slice(-3, -1).join(',').trim());
    setConfirmada(true);
    setSugerencias([]);
    setSinResultados(false);
  };

  return (
    <div className="cd">
      <input
        id={id}
        className={className}
        maxLength={255}
        autoComplete="off"
        placeholder={placeholder || 'Calle, barrio y ciudad. Ej.: Calle 52A #56-42, Belén, Medellín'}
        value={value}
        onChange={(e) => escribir(e.target.value)}
        onBlur={() => setTimeout(() => setSugerencias([]), 200)}
        aria-describedby={id ? `${id}-ayuda` : undefined}
        {...resto}
      />
      {(sugerencias.length > 0 || buscando) && (
        <ul className="cd-lista" role="listbox">
          {buscando && sugerencias.length === 0 && <li className="cd-info">Buscando direcciones...</li>}
          {sugerencias.map((s, i) => (
            <li key={i}><button type="button" onMouseDown={(e) => { e.preventDefault(); elegir(s); }}>{s.display_name}</button></li>
          ))}
        </ul>
      )}
      <p className="cd-ayuda" id={id ? `${id}-ayuda` : undefined}>
        {confirmada ? (
          <span className="cd-ok">📍 Ubicada en el mapa{lugar ? `: ${lugar}` : ''}. Si no es tu ciudad, corrige la dirección.</span>
        ) : value.trim() && !buscando ? (
          <span className="cd-aviso">
            {sinResultados
              ? 'No encontramos esa dirección. Escribe calle, barrio y ciudad.'
              : 'Elige tu dirección de la lista para ubicarla en el mapa.'}
          </span>
        ) : (
          <span>{requerida ? 'Obligatoria: ' : ''}Escribe calle, barrio y <b>ciudad</b> y elige una opción de la lista. Así los clientes cercanos te encuentran en el mapa.</span>
        )}
      </p>
    </div>
  );
}
