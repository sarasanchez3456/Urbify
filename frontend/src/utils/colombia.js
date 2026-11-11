// Centro geográfico de Colombia y límites del territorio
export const COLOMBIA_CENTER = [4.5709, -74.2973];
export const COLOMBIA_ZOOM = 6;

// Bounding box que cubre todo el territorio colombiano (incluidas islas)
export const COLOMBIA_BOUNDS = [
  [-4.23, -81.73], // suroeste
  [13.39, -66.85], // noreste
];

// Viewbox para priorizar ciudades principales en geocodificación (zona continental principal)
const VIEWBOX = '-79.0,12.5,-66.85,-4.23';

export async function geocodificarDireccion(texto) {
  if (!texto || texto.trim().length < 3) return [];

  const params = new URLSearchParams({
    q: texto,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'co',
    viewbox: VIEWBOX,
    bounded: '1',
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { 'Accept-Language': 'es', 'User-Agent': 'Urbify/1.0 (teamlocknetsix@gmail.com)' } }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return data.map((item) => ({
    display_name: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    address: item.address,
  }));
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
