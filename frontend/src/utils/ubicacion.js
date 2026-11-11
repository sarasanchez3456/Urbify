// Ubicación del cliente: se guarda en el navegador para no pedirla otra vez al pasar de Buscar a Solicitar.
const CLAVE = 'urbify_ubicacion';

export function leerUbicacion() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (v && Number.isFinite(v.lat) && Number.isFinite(v.lng)) return { lat: v.lat, lng: v.lng, direccion: typeof v.direccion === 'string' ? v.direccion : '' };
  } catch { /* sin almacenamiento o dato dañado: se trata como si no hubiera ubicación */ }
  return null;
}

export function guardarUbicacion(ubicacion) {
  try {
    if (ubicacion) localStorage.setItem(CLAVE, JSON.stringify(ubicacion));
    else localStorage.removeItem(CLAVE);
  } catch { /* el navegador no deja guardar: la ubicación solo vale para esta pantalla */ }
}

// Distancia en km entre dos puntos (fórmula de haversine).
export function distanciaKm(lat1, lng1, lat2, lng2) {
  const rad = (g) => (g * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function textoDistancia(km) {
  if (!Number.isFinite(km)) return '';
  return km < 1 ? `a ${Math.max(100, Math.round(km * 10) * 100)} m` : `a ${km.toLocaleString('es-CO', { maximumFractionDigits: 1 })} km`;
}
