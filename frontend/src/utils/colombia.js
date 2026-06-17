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
    { headers: { 'Accept-Language': 'es' } }
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

export function estaDentroDeColombia(lat, lng) {
  return lat >= -4.23 && lat <= 13.39 && lng >= -81.73 && lng <= -66.85;
}
