// Ubicación del cliente y dirección (issue #7): guardado seguro en el navegador, distancias y variantes de búsqueda.
import { describe, it, expect, beforeEach } from 'vitest';
import { leerUbicacion, guardarUbicacion, distanciaKm, textoDistancia } from './ubicacion';
import { variantesDeDireccion, estaDentroDeColombia } from './colombia';
import { formatoPesos } from './moneda';

describe('ubicación guardada en el navegador', () => {
  beforeEach(() => localStorage.clear());

  it('guarda y vuelve a leer la ubicación', () => {
    guardarUbicacion({ lat: 6.25, lng: -75.57, direccion: 'Laureles, Medellín' });
    expect(leerUbicacion()).toEqual({ lat: 6.25, lng: -75.57, direccion: 'Laureles, Medellín' });
  });

  it('guardar null la borra', () => {
    guardarUbicacion({ lat: 1, lng: 2 });
    guardarUbicacion(null);
    expect(leerUbicacion()).toBeNull();
  });

  it('un dato dañado o con coordenadas falsas se ignora (no rompe ni se usa)', () => {
    localStorage.setItem('urbify_ubicacion', '{no es json');
    expect(leerUbicacion()).toBeNull();
    localStorage.setItem('urbify_ubicacion', JSON.stringify({ lat: '<script>', lng: 5 }));
    expect(leerUbicacion()).toBeNull();
    localStorage.setItem('urbify_ubicacion', JSON.stringify({ lat: 1, lng: 2, direccion: { x: 1 } }));
    expect(leerUbicacion().direccion).toBe('');
  });
});

describe('distancias', () => {
  it('Medellín–Bogotá está a unos 240 km en línea recta', () => {
    const km = distanciaKm(6.2442, -75.5812, 4.711, -74.0721);
    expect(km).toBeGreaterThan(230);
    expect(km).toBeLessThan(250);
  });

  it('el mismo punto está a 0 km', () => {
    expect(distanciaKm(4.6, -74.1, 4.6, -74.1)).toBe(0);
  });

  it('el texto usa metros por debajo de 1 km (mínimo 100 m) y km por encima', () => {
    expect(textoDistancia(0.02)).toBe('a 100 m');
    expect(textoDistancia(0.46)).toBe('a 500 m');
    expect(textoDistancia(2.34)).toBe('a 2,3 km');
    expect(textoDistancia(NaN)).toBe('');
  });
});

describe('dirección y territorio', () => {
  it('una dirección larga genera versiones cada vez más cortas, sin repetidas', () => {
    expect(variantesDeDireccion('Cra 70 #45-12, Laureles, Medellín')).toEqual([
      'Cra 70 #45-12, Laureles, Medellín',
      'Laureles, Medellín',
      'Medellín',
    ]);
  });

  it('un texto vacío o muy corto no genera búsquedas', () => {
    expect(variantesDeDireccion('')).toEqual([]);
    expect(variantesDeDireccion('ab')).toEqual([]);
    expect(variantesDeDireccion(null)).toEqual([]);
  });

  it('limita el largo para no mandar textos enormes al servicio de mapas', () => {
    const [primera] = variantesDeDireccion('a'.repeat(5000));
    expect(primera.length).toBeLessThanOrEqual(200);
  });

  it('reconoce si un punto está dentro de Colombia', () => {
    expect(estaDentroDeColombia(4.71, -74.07)).toBe(true);
    expect(estaDentroDeColombia(40.4, -3.7)).toBe(false); // Madrid
  });

  it('pesos colombianos: separador de miles y $0 si no es número', () => {
    expect(formatoPesos(50000)).toBe('$50.000');
    expect(formatoPesos('x')).toBe('$0');
  });
});
