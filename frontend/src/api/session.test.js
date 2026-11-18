// Sesión del navegador (issue #7): solo se guarda el token; los datos del usuario viven en memoria.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crearJwt } from '../test/jwt';
import {
  getToken, setToken, clearSession, tokenExpiresAt, isTokenExpired, endSession, onSessionEnded, onTokenChangedInOtherTab,
} from './session';


describe('sesión del navegador', () => {
  beforeEach(() => localStorage.clear());

  it('guarda solo el token y borra la clave antigua con datos del usuario', () => {
    localStorage.setItem('usuario', JSON.stringify({ nombre: 'Ana' }));
    setToken('abc');
    expect(getToken()).toBe('abc');
    expect(localStorage.getItem('usuario')).toBeNull();
    expect(Object.keys(localStorage)).toEqual(['token']);
  });

  it('clearSession borra todo y getToken devuelve null', () => {
    setToken('abc');
    clearSession();
    expect(getToken()).toBeNull();
  });

  it('funciona aunque el almacenamiento esté bloqueado (modo privado estricto)', () => {
    vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => { throw new Error('bloqueado'); });
    expect(getToken()).toBeNull();
    expect(() => setToken('x')).not.toThrow();
    expect(() => clearSession()).not.toThrow();
  });

  it('lee la expiración del JWT y detecta tokens vencidos', () => {
    const ahora = Date.now();
    const vivo = crearJwt(Math.floor(ahora / 1000) + 3600);
    const vencido = crearJwt(Math.floor(ahora / 1000) - 10);
    expect(tokenExpiresAt(vivo)).toBeGreaterThan(ahora);
    expect(isTokenExpired(vivo, ahora)).toBe(false);
    expect(isTokenExpired(vencido, ahora)).toBe(true);
  });

  it('un token ilegible no se considera vencido (lo decide el servidor)', () => {
    expect(tokenExpiresAt('esto-no-es-un-jwt')).toBeNull();
    expect(isTokenExpired('esto-no-es-un-jwt')).toBe(false);
  });

  it('endSession borra el token y avisa a quien escucha; se puede dejar de escuchar', () => {
    setToken('abc');
    const avisado = vi.fn();
    const dejar = onSessionEnded(avisado);
    endSession();
    expect(getToken()).toBeNull();
    expect(avisado).toHaveBeenCalledTimes(1);
    dejar();
    endSession();
    expect(avisado).toHaveBeenCalledTimes(1);
  });

  it('avisa cuando OTRA pestaña cambia el token o borra el almacenamiento, y no por otras claves', () => {
    const alCambiar = vi.fn();
    const dejar = onTokenChangedInOtherTab(alCambiar);
    setToken('nuevo');
    window.dispatchEvent(new StorageEvent('storage', { key: 'token' }));
    expect(alCambiar).toHaveBeenLastCalledWith('nuevo');
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(alCambiar).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new StorageEvent('storage', { key: 'otra-cosa' }));
    expect(alCambiar).toHaveBeenCalledTimes(2);
    dejar();
    window.dispatchEvent(new StorageEvent('storage', { key: 'token' }));
    expect(alCambiar).toHaveBeenCalledTimes(2);
  });
});
