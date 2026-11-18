// Interceptor de Axios (issue #7): manda el token, no lo manda en login/registro, limpia tokens vencidos y solo cierra
// la sesión con un 401 del token ACTUAL (no por respuestas tardías de una sesión anterior).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import api, { setOnUnauthorized } from './axios';
import { setToken, getToken } from './session';
import { crearJwt } from '../test/jwt';

const jwtVivo = () => crearJwt(Math.floor(Date.now() / 1000) + 3600);
const jwtVencido = () => crearJwt(Math.floor(Date.now() / 1000) - 60);

// Adaptador de mentira: no hay red; responde lo que le indiquemos y guarda lo que se envió.
function simular(estado = 200) {
  const enviadas = [];
  api.defaults.adapter = async (config) => {
    enviadas.push(config);
    if (estado >= 400) {
      const error = new Error(`HTTP ${estado}`);
      error.config = config;
      error.response = { status: estado, data: {} };
      throw error;
    }
    return { data: {}, status: estado, statusText: 'OK', headers: {}, config };
  };
  return enviadas;
}

describe('interceptor de Axios', () => {
  beforeEach(() => {
    localStorage.clear();
    setOnUnauthorized(null);
  });

  it('envía el token en las peticiones normales', async () => {
    const token = jwtVivo();
    setToken(token);
    const enviadas = simular();
    await api.get('/servicios/mios');
    expect(enviadas[0].headers.Authorization).toBe(`Bearer ${token}`);
  });

  it('no envía el token a login ni a registro', async () => {
    setToken(jwtVivo());
    const enviadas = simular();
    await api.post('/auth/login', {});
    await api.post('/auth/registro', {});
    expect(enviadas[0].headers.Authorization).toBeUndefined();
    expect(enviadas[1].headers.Authorization).toBeUndefined();
  });

  it('con un token vencido lo borra y la petición sale sin credenciales', async () => {
    setToken(jwtVencido());
    const enviadas = simular();
    await api.get('/servicios/buscar');
    expect(getToken()).toBeNull();
    expect(enviadas[0].headers.Authorization).toBeUndefined();
  });

  it('un 401 con el token actual cierra la sesión y avisa a la app', async () => {
    const token = jwtVivo();
    setToken(token);
    const aviso = vi.fn();
    setOnUnauthorized(aviso);
    simular(401);
    await expect(api.get('/auth/perfil')).rejects.toBeTruthy();
    expect(getToken()).toBeNull();
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('un 401 de login o registro (credenciales incorrectas) NO cierra ninguna sesión', async () => {
    const token = jwtVivo();
    setToken(token);
    const aviso = vi.fn();
    setOnUnauthorized(aviso);
    simular(401);
    await expect(api.post('/auth/login', {})).rejects.toBeTruthy();
    expect(getToken()).toBe(token);
    expect(aviso).not.toHaveBeenCalled();
  });

  it('un 401 tardío de una sesión anterior no cierra la sesión nueva', async () => {
    const viejo = jwtVivo();
    const nuevo = crearJwt(Math.floor(Date.now() / 1000) + 7200);
    setToken(viejo);
    const aviso = vi.fn();
    setOnUnauthorized(aviso);
    api.defaults.adapter = async (config) => {
      setToken(nuevo); // mientras la petición viaja, la persona inicia otra sesión
      const error = new Error('HTTP 401');
      error.config = config;
      error.response = { status: 401, data: {} };
      throw error;
    };
    await expect(api.get('/solicitudes/cliente')).rejects.toBeTruthy();
    expect(getToken()).toBe(nuevo);
    expect(aviso).not.toHaveBeenCalled();
  });

  it('otros errores (403, 500) no cierran la sesión', async () => {
    const token = jwtVivo();
    setToken(token);
    for (const estado of [403, 404, 500]) {
      simular(estado);
      await expect(api.get('/algo')).rejects.toBeTruthy();
    }
    expect(getToken()).toBe(token);
  });
});
