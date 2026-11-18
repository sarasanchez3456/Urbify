// Eliminar la propia cuenta: pide la contraseña, muestra el error del servidor (contraseña incorrecta o solicitudes
// abiertas) sin perder lo escrito, y al terminar cierra la sesión y vuelve al inicio.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
const auth = { logout: vi.fn() };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../api/axios', () => ({ default: { delete: vi.fn() } }));
vi.mock('../utils/log', () => ({ logError: vi.fn() }));
vi.mock('./PanelLateral', () => ({ default: ({ children }) => <div>{children}</div> }));
import api from '../api/axios';
import EliminarCuenta from './EliminarCuenta';

const clave = () => screen.getByLabelText(/escribe tu contraseña/i);
const boton = () => screen.getByRole('button', { name: /^eliminar mi cuenta$/i });

describe('EliminarCuenta', () => {
  beforeEach(() => {
    navigate.mockReset();
    auth.logout.mockReset();
    api.delete.mockReset();
  });

  it('no deja eliminar sin escribir la contraseña', () => {
    render(<EliminarCuenta onCerrar={() => {}} />);
    expect(boton().disabled).toBe(true);
    fireEvent.change(clave(), { target: { value: 'Clave-1234' } });
    expect(boton().disabled).toBe(false);
  });

  it('muestra el error del servidor y conserva la contraseña escrita', async () => {
    api.delete.mockRejectedValue({ response: { data: { error: 'Tienes solicitudes abiertas' } } });
    render(<EliminarCuenta onCerrar={() => {}} />);
    fireEvent.change(clave(), { target: { value: 'Clave-1234' } });
    fireEvent.click(boton());
    expect((await screen.findByRole('alert')).textContent).toMatch(/solicitudes abiertas/);
    expect(api.delete).toHaveBeenCalledWith('/auth/perfil', { data: { contrasena: 'Clave-1234' } });
    expect(clave().value).toBe('Clave-1234');
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('al eliminarla avisa, cierra la sesión y lleva al inicio', async () => {
    api.delete.mockResolvedValue({ data: { mensaje: 'Tu cuenta fue eliminada' } });
    const onCerrar = vi.fn();
    render(<EliminarCuenta onCerrar={onCerrar} />);
    fireEvent.change(clave(), { target: { value: 'Clave-1234' } });
    fireEvent.click(boton());
    await screen.findByText(/tu cuenta fue eliminada/i);
    fireEvent.click(screen.getByRole('button', { name: /ir al inicio/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
    expect(auth.logout).toHaveBeenCalled();
    expect(onCerrar).toHaveBeenCalled();
  });
});
