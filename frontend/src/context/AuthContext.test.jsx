// AuthContext (issue #7): el registro NO inicia sesión, la verificación del correo sí, y el modo activo se refleja en `rol`.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, normalizarUsuario } from './AuthContext';
import { getToken, setToken } from '../api/session';
import { crearJwt } from '../test/jwt';

vi.mock('../api/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import api from '../api/axios';

const jwtVivo = () => crearJwt(Math.floor(Date.now() / 1000) + 3600);
const usuarioApi = (extra = {}) => ({ id: 7, nombre: 'Ana', apellido: 'Pérez', correo: 'ana@x.co', rol: 'cliente', es_proveedor: false, modo_activo: 'cliente', ...extra });
const montar = () => renderHook(() => useAuth(), { wrapper: AuthProvider });

describe('normalizarUsuario', () => {
  it('el modo activo pasa a ser `rol` y se calcula si la cuenta puede ser proveedor', () => {
    expect(normalizarUsuario(usuarioApi({ es_proveedor: true, modo_activo: 'proveedor' }))).toMatchObject({ rol: 'proveedor', esProveedor: true });
    expect(normalizarUsuario(usuarioApi({ es_proveedor: true, modo_activo: 'cliente' }))).toMatchObject({ rol: 'cliente', esProveedor: true });
    expect(normalizarUsuario(usuarioApi())).toMatchObject({ rol: 'cliente', esProveedor: false });
  });

  it('el administrador queda aparte: nunca es proveedor', () => {
    expect(normalizarUsuario({ id: 1, rol: 'admin', es_proveedor: true })).toMatchObject({ rol: 'admin', esProveedor: false });
  });

  it('sin modo activo (respuestas antiguas) usa el rol de la cuenta', () => {
    expect(normalizarUsuario({ id: 2, rol: 'proveedor' })).toMatchObject({ rol: 'proveedor', esProveedor: true });
  });
});

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
    api.post.mockReset();
  });

  it('sin token no hay sesión y no se consulta el perfil', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.usuario).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('con un token vigente restaura la sesión pidiendo el perfil al servidor', async () => {
    setToken(jwtVivo());
    api.get.mockResolvedValue({ data: usuarioApi() });
    const { result } = montar();
    await waitFor(() => expect(result.current.usuario?.nombre).toBe('Ana'));
    expect(api.get).toHaveBeenCalledWith('/auth/perfil');
  });

  it('con un token vencido lo borra y no pide nada', async () => {
    setToken(crearJwt(Math.floor(Date.now() / 1000) - 60));
    const { result } = montar();
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(getToken()).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('login guarda el token y el usuario en memoria', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.cargando).toBe(false));
    api.post.mockResolvedValue({ data: { token: 'tok-1', usuario: usuarioApi() } });
    await act(async () => { await result.current.login('ana@x.co', 'Clave-1234'); });
    expect(api.post).toHaveBeenCalledWith('/auth/login', { correo: 'ana@x.co', contrasena: 'Clave-1234' });
    expect(getToken()).toBe('tok-1');
    expect(result.current.usuario.correo).toBe('ana@x.co');
  });

  it('registrar NO inicia sesión: devuelve la respuesta (sin token) y no guarda nada', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.cargando).toBe(false));
    api.post.mockResolvedValue({ data: { requiere_verificacion: true, correo: 'ana@x.co' } });
    let respuesta;
    await act(async () => { respuesta = await result.current.registrar({ correo: 'ana@x.co' }); });
    expect(respuesta.requiere_verificacion).toBe(true);
    expect(getToken()).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  it('verificarCorreo con el código correcto inicia la sesión', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.cargando).toBe(false));
    api.post.mockResolvedValue({ data: { token: 'tok-2', usuario: usuarioApi() } });
    await act(async () => { await result.current.verificarCorreo('ana@x.co', 'ABC234'); });
    expect(api.post).toHaveBeenCalledWith('/auth/verificar-correo', { correo: 'ana@x.co', codigo: 'ABC234' });
    expect(getToken()).toBe('tok-2');
    expect(result.current.usuario.nombre).toBe('Ana');
  });

  it('un código incorrecto no inicia sesión y el error llega a quien llamó', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.cargando).toBe(false));
    api.post.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 400, data: { error: 'Código inválido o vencido' } } }));
    await act(async () => {
      await expect(result.current.verificarCorreo('ana@x.co', 'AAAAAA')).rejects.toMatchObject({ response: { status: 400 } });
    });
    expect(getToken()).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  it('logout cierra la sesión local de inmediato y avisa al servidor con el token que tenía', async () => {
    setToken(jwtVivo());
    const token = getToken();
    api.get.mockResolvedValue({ data: usuarioApi() });
    api.post.mockResolvedValue({ data: {} });
    const { result } = montar();
    await waitFor(() => expect(result.current.usuario).not.toBeNull());
    act(() => result.current.logout());
    expect(getToken()).toBeNull();
    expect(result.current.usuario).toBeNull();
    expect(api.post).toHaveBeenCalledWith('/auth/logout', undefined, { headers: { Authorization: `Bearer ${token}` } });
  });

  it('logout funciona aunque el servidor no responda', async () => {
    setToken(jwtVivo());
    api.get.mockResolvedValue({ data: usuarioApi() });
    api.post.mockRejectedValue(new Error('sin red'));
    const { result } = montar();
    await waitFor(() => expect(result.current.usuario).not.toBeNull());
    act(() => result.current.logout());
    expect(result.current.usuario).toBeNull();
    expect(getToken()).toBeNull();
  });

  it('cambiarModo guarda el token nuevo y recarga el perfil con el modo nuevo', async () => {
    setToken(jwtVivo());
    api.get.mockResolvedValueOnce({ data: usuarioApi({ es_proveedor: true, modo_activo: 'cliente' }) });
    const { result } = montar();
    await waitFor(() => expect(result.current.usuario?.rol).toBe('cliente'));
    api.post.mockResolvedValue({ data: { token: 'tok-modo' } });
    api.get.mockResolvedValueOnce({ data: usuarioApi({ es_proveedor: true, modo_activo: 'proveedor' }) });
    await act(async () => { await result.current.cambiarModo('proveedor'); });
    expect(api.post).toHaveBeenCalledWith('/auth/cambiar-modo', { modo: 'proveedor' });
    expect(getToken()).toBe('tok-modo');
    expect(result.current.usuario.rol).toBe('proveedor');
  });

  it('serProveedor manda la categoría como número y recarga el perfil', async () => {
    setToken(jwtVivo());
    api.get.mockResolvedValueOnce({ data: usuarioApi() });
    const { result } = montar();
    await waitFor(() => expect(result.current.usuario).not.toBeNull());
    api.post.mockResolvedValue({ data: { token: 'tok-prov' } });
    api.get.mockResolvedValueOnce({ data: usuarioApi({ es_proveedor: true, modo_activo: 'proveedor' }) });
    await act(async () => { await result.current.serProveedor({ oficio: 'Plomero', categoriaId: '2' }); });
    expect(api.post).toHaveBeenCalledWith('/auth/ser-proveedor', { oficio: 'Plomero', categoria_id: 2 });
    expect(result.current.usuario.esProveedor).toBe(true);
  });

  it('useAuth fuera del proveedor lanza un error claro', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});
