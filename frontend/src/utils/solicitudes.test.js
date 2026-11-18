// Funciones de apoyo de las solicitudes (issue #7): estados, seguimiento, dinero y fechas en hora de Colombia.
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  indicePaso, estadoDelPaso, formatearDinero, estaSinCalificar, iniciales, fechaServicioLarga, fechaHoraCorta,
  fechaRelativa, etiquetaDia, claveDia, horaMensaje, ETIQUETA_MOTIVO, MOTIVOS_POSITIVOS, MOTIVOS_NEGATIVOS,
} from './solicitudes';

afterEach(() => vi.useRealTimers());

describe('seguimiento de la solicitud', () => {
  it('cada estado tiene su paso y uno desconocido o cancelada queda fuera del camino', () => {
    expect(['pendiente', 'aceptada', 'en_proceso', 'completada'].map(indicePaso)).toEqual([0, 1, 2, 3]);
    expect(indicePaso('cancelada')).toBe(-1);
    expect(indicePaso('inventado')).toBe(-1);
  });

  it('en proceso: los pasos anteriores están hechos, el actual marcado y el resto pendientes', () => {
    expect([0, 1, 2, 3].map((i) => estadoDelPaso('en_proceso', i))).toEqual(['hecho', 'hecho', 'actual', 'pendiente']);
  });

  it('completada: todos los pasos están hechos', () => {
    expect([0, 1, 2, 3].map((i) => estadoDelPaso('completada', i))).toEqual(['hecho', 'hecho', 'hecho', 'hecho']);
  });

  it('cancelada: ningún paso queda hecho ni actual', () => {
    expect([0, 1, 2, 3].map((i) => estadoDelPaso('cancelada', i))).toEqual(['pendiente', 'pendiente', 'pendiente', 'pendiente']);
  });
});

describe('dinero y datos sueltos', () => {
  it('formatea pesos colombianos sin centavos', () => {
    expect(formatearDinero(50000)).toBe('$50.000');
    expect(formatearDinero('1234567.89')).toBe('$1.234.568');
  });

  it('un valor que no es número se muestra como $0, nunca como NaN', () => {
    expect(formatearDinero(undefined)).toBe('$0');
    expect(formatearDinero('abc')).toBe('$0');
  });

  it('solo una solicitud completada y sin nota está "sin calificar"', () => {
    expect(estaSinCalificar({ estado: 'completada', calificacion_puntuacion: null })).toBe(true);
    expect(estaSinCalificar({ estado: 'completada' })).toBe(true);
    expect(estaSinCalificar({ estado: 'completada', calificacion_puntuacion: 0 })).toBe(false);
    expect(estaSinCalificar({ estado: 'completada', calificacion_puntuacion: 5 })).toBe(false);
    expect(estaSinCalificar({ estado: 'en_proceso', calificacion_puntuacion: null })).toBe(false);
  });

  it('las iniciales ignoran espacios y vacíos', () => {
    expect(iniciales(' ana', 'pérez')).toBe('AP');
    expect(iniciales('Ana', '')).toBe('A');
    expect(iniciales(null, undefined)).toBe('?');
  });

  it('los motivos de calificación no se repiten y todos tienen etiqueta', () => {
    const codigos = [...MOTIVOS_POSITIVOS, ...MOTIVOS_NEGATIVOS].map(([c]) => c);
    expect(new Set(codigos).size).toBe(codigos.length);
    for (const c of codigos) expect(ETIQUETA_MOTIVO[c]).toBeTruthy();
  });
});

describe('fechas (siempre en hora de Colombia, UTC-5)', () => {
  it('muestra la hora de Colombia aunque llegue en UTC', () => {
    // 11:11 UTC del 11 de noviembre de 2026 = 6:11 a. m. en Bogotá
    const iso = '2026-11-11T11:11:00.000Z';
    expect(fechaServicioLarga(iso)).toMatch(/miércoles.*11 de noviembre.*6:11/);
    expect(fechaHoraCorta(iso)).toMatch(/11 (de )?nov.*6:11/);
    expect(fechaHoraCorta(iso)).not.toMatch(/nov\./); // sin punto de abreviatura
    expect(horaMensaje(iso)).toMatch(/6:11/);
  });

  it('el día cambia con la hora de Colombia, no con la de UTC', () => {
    // 02:00 UTC del día 12 todavía es el 11 a las 9 p. m. en Colombia
    expect(claveDia('2026-11-12T02:00:00Z')).toBe('2026-11-11');
  });

  it('una fecha vacía o dañada devuelve texto vacío y no rompe la pantalla', () => {
    for (const f of [fechaServicioLarga, fechaHoraCorta, fechaRelativa, horaMensaje, etiquetaDia, claveDia]) {
      expect(f(null)).toBe('');
      expect(f('no es fecha')).toBe('');
    }
  });

  it('fecha relativa: hoy, ayer, hace N días', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T15:00:00Z'));
    expect(fechaRelativa('2026-11-20T10:00:00Z')).toBe('hoy');
    expect(fechaRelativa('2026-11-19T10:00:00Z')).toBe('ayer');
    expect(fechaRelativa('2026-11-15T10:00:00Z')).toBe('hace 5 días');
    expect(fechaRelativa('2026-09-01T10:00:00Z')).toMatch(/2026/);
  });

  it('etiqueta del chat: Hoy, Ayer o la fecha', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T15:00:00Z'));
    expect(etiquetaDia('2026-11-20T13:00:00Z')).toBe('Hoy');
    expect(etiquetaDia('2026-11-19T13:00:00Z')).toBe('Ayer');
    expect(etiquetaDia('2026-11-10T13:00:00Z')).toMatch(/10 (de )?nov/);
  });
});
