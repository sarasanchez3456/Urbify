// Tarjeta "Ofrece tus servicios" (issue #7, doble modo): solo la ve un cliente que aún no es proveedor, valida los datos,
// habilita la cuenta y cambia a modo proveedor; los errores (red, 403, 429, categorías) se muestran sin perder lo escrito.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const auth = { usuario: null, serProveedor: vi.fn(), cambiarModo: vi.fn() };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../api/axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../utils/log', () => ({ logError: vi.fn() }));
import api from '../api/axios';
import OfrecerServicios from './OfrecerServicios';

const CATEGORIAS = [{ id: 1, nombre: 'Plomería' }, { id: 2, nombre: 'Electricidad' }];

const abrir = async () => {
  fireEvent.click(screen.getByRole('button', { name: /quiero ofrecer mis servicios/i }));
  await screen.findByRole('option', { name: 'Plomería' });
};
const oficio = () => screen.getByLabelText(/a qué te dedicas/i);
const categoria = () => screen.getByLabelText(/categoría principal/i);
const empezar = () => screen.getByRole('button', { name: /empezar a ofrecer/i });

describe('OfrecerServicios', () => {
  beforeEach(() => {
    navigate.mockReset();
    auth.usuario = { id: 1, rol: 'cliente', esProveedor: false };
    auth.serProveedor.mockReset();
    auth.cambiarModo.mockReset();
    api.get.mockReset();
    api.get.mockResolvedValue({ data: CATEGORIAS });
  });

  it('no se muestra a un proveedor, a un cliente que ya es proveedor ni a un administrador', () => {
    for (const usuario of [
      { rol: 'proveedor', esProveedor: true },
      { rol: 'cliente', esProveedor: true },
      { rol: 'admin' },
      null,
    ]) {
      auth.usuario = usuario;
      const { container, unmount } = render(<OfrecerServicios />);
      expect(container.innerHTML).toBe('');
      unmount();
    }
  });

  it('carga las categorías solo al abrir el formulario', async () => {
    render(<OfrecerServicios />);
    expect(api.get).not.toHaveBeenCalled();
    await abrir();
    expect(api.get).toHaveBeenCalledWith('/categorias');
  });

  it('el botón se activa solo con oficio de al menos 2 letras y una categoría', async () => {
    render(<OfrecerServicios />);
    await abrir();
    expect(empezar().disabled).toBe(true);
    fireEvent.change(oficio(), { target: { value: ' P ' } });
    fireEvent.change(categoria(), { target: { value: '1' } });
    expect(empezar().disabled).toBe(true);
    fireEvent.change(oficio(), { target: { value: 'Plomero' } });
    expect(empezar().disabled).toBe(false);
  });

  it('habilita la cuenta con el oficio sin espacios, cambia a modo proveedor y va al panel', async () => {
    auth.serProveedor.mockResolvedValue({});
    auth.cambiarModo.mockResolvedValue({});
    render(<OfrecerServicios />);
    await abrir();
    fireEvent.change(oficio(), { target: { value: '  Plomero  ' } });
    fireEvent.change(categoria(), { target: { value: '2' } });
    fireEvent.click(empezar());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'));
    expect(auth.serProveedor).toHaveBeenCalledWith({ oficio: 'Plomero', categoriaId: '2' });
    expect(auth.cambiarModo).toHaveBeenCalledWith('proveedor');
  });

  it('Enter en el campo de oficio envía igual (la tarjeta vive dentro de otro formulario)', async () => {
    auth.serProveedor.mockResolvedValue({});
    auth.cambiarModo.mockResolvedValue({});
    render(<OfrecerServicios />);
    await abrir();
    fireEvent.change(oficio(), { target: { value: 'Plomero' } });
    fireEvent.change(categoria(), { target: { value: '1' } });
    fireEvent.keyDown(oficio(), { key: 'Enter' });
    await waitFor(() => expect(auth.serProveedor).toHaveBeenCalledTimes(1));
  });

  it.each([
    ['sin conexión', new Error('sin red'), /no pudimos conectar con el servidor/i],
    ['429', { response: { status: 429, data: {} } }, /demasiados intentos/i],
    ['403 con mensaje', { response: { status: 403, data: { error: 'Tu cuenta está suspendida' } } }, /tu cuenta está suspendida/i],
    ['400 sin mensaje', { response: { status: 400, data: {} } }, /no se pudo habilitar tu cuenta/i],
  ])('muestra el error (%s), no cambia de modo y deja reintentar', async (_caso, error, mensaje) => {
    auth.serProveedor.mockRejectedValue(error);
    render(<OfrecerServicios />);
    await abrir();
    fireEvent.change(oficio(), { target: { value: 'Plomero' } });
    fireEvent.change(categoria(), { target: { value: '1' } });
    fireEvent.click(empezar());
    expect((await screen.findByRole('alert')).textContent).toMatch(mensaje);
    expect(auth.cambiarModo).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(oficio().value).toBe('Plomero');
    expect(empezar().disabled).toBe(false);
  });

  it('si no cargan las categorías lo avisa y no deja enviar', async () => {
    api.get.mockRejectedValue(new Error('sin red'));
    render(<OfrecerServicios />);
    fireEvent.click(screen.getByRole('button', { name: /quiero ofrecer mis servicios/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/no se pudieron cargar las categorías/i);
    expect(categoria().disabled).toBe(true);
    expect(empezar().disabled).toBe(true);
  });

  it('Cancelar cierra el formulario y borra el error', async () => {
    api.get.mockRejectedValue(new Error('sin red'));
    render(<OfrecerServicios />);
    fireEvent.click(screen.getByRole('button', { name: /quiero ofrecer mis servicios/i }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: /quiero ofrecer mis servicios/i })).toBeTruthy();
  });
});
