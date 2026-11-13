// Centro geográfico de Colombia y límites del territorio
export const COLOMBIA_CENTER = [4.5709, -74.2973];
export const COLOMBIA_ZOOM = 6;

// Bounding box que cubre todo el territorio colombiano (incluidas islas)
export const COLOMBIA_BOUNDS = [
  [-4.23, -81.73], // suroeste
  [13.39, -66.85], // noreste
];

// Una sola consulta a Nominatim, limitada a Colombia (countrycodes). No se usa viewbox/bounded: dejaba fuera zonas.
async function consultarNominatim(texto) {
  const params = new URLSearchParams({ q: texto, format: 'json', addressdetails: '1', limit: '5', countrycodes: 'co' });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': 'es' } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item) => ({
    display_name: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    address: item.address,
  }));
}

// Versiones cada vez más cortas de lo que escribió la persona. Nominatim solo entiende bien direcciones completas
// y exactas; si "Cra 70 #45-12, Laureles, Medellín" no existe en el mapa, se prueba "Laureles, Medellín", luego
// "Medellín". Así una dirección larga, mal escrita o inexistente igual ubica el barrio o la ciudad.
export function variantesDeDireccion(texto) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (limpio.length < 3) return [];
  const partes = limpio.split(',').map((p) => p.trim()).filter(Boolean);
  // Quita la numeración de la vía: "# 45-12", "No. 45", "45-12 sur", etc.
  const sinNumero = (p) => p.replace(/\s*(#|no\.?|n°|nº)\s*[\w-]+(\s*-\s*[\w-]+)?/gi, '').replace(/\s+\d+[a-z]?(\s*-\s*\d+)?$/i, '').trim();
  const candidatas = [
    limpio,
    // Si al quitar el número solo queda el tipo de vía ("Cra"), esa parte no sirve y se descarta.
    partes.length > 1 ? [sinNumero(partes[0]).split(' ').length >= 2 ? sinNumero(partes[0]) : '', ...partes.slice(1)].filter(Boolean).join(', ') : '',
    partes.length > 2 ? partes.slice(-2).join(', ') : '',
    partes.length > 1 ? partes[partes.length - 1] : '',
  ];
  return [...new Set(candidatas.filter((c) => c.length >= 3))];
}

// Busca la dirección; si no hay resultados prueba con versiones más cortas hasta encontrar algo.
export async function geocodificarDireccion(texto) {
  for (const variante of variantesDeDireccion(texto)) {
    const resultados = await consultarNominatim(variante);
    if (resultados.length > 0) return resultados;
  }
  return [];
}

// De unas coordenadas a una dirección corta legible ("Cra. 70 #45-12, Laureles, Medellín"). Devuelve '' si no se pudo.
export async function coordenadasADireccion(lat, lng) {
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: 'json', addressdetails: '1', zoom: '18' });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: { 'Accept-Language': 'es' } });
    if (!res.ok) return '';
    const data = await res.json();
    const a = data.address || {};
    const calle = [a.road, a.house_number].filter(Boolean).join(' ');
    const barrio = a.neighbourhood || a.suburb || a.quarter || '';
    const ciudad = a.city || a.town || a.village || a.municipality || '';
    const partes = [calle, barrio, ciudad].filter(Boolean);
    return (partes.length > 0 ? partes.join(', ') : (data.display_name || '').split(',').slice(0, 3).join(',')).trim();
  } catch {
    return '';
  }
}

export function estaDentroDeColombia(lat, lng) {
  return lat >= -4.23 && lat <= 13.39 && lng >= -81.73 && lng <= -66.85;
}
