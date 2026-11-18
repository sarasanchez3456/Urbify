// Formularios de inicio de sesión y registro (issue #7): qué se envía, a dónde lleva y cómo se muestran los errores
// (credenciales, bloqueo por demasiados intentos, correo sin verificar, servidor caído).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.fn();
vi.mock('react-router-dom', async (original) => ({ ...(await original()), useNavigate: () => navigate }));

const auth = { login: vi.fn(), registrar: vi.fn(), verificarCorreo: vi.fn(), usuario: null };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../api/axios', () => ({ default: { post: vi.fn().mockResolvedValue({ data: {} }) } }));
vi.mock('../utils/log', () => ({ logError: vi.fn() }));

import Auth from './Auth';

const montar = (ruta = '/login') => render(<MemoryRouter initialEntries={[ruta]}><Auth /></MemoryRouter>);
const escribir = (etiqueta, valor) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
const botonEnviar = () => document.querySelector('form button[type="submit"]');

describe('Auth – inicio de sesión', () => {
  beforeEach(() => {
    navigate.mockReset();
    auth.login.mockReset();
    auth.usuario = null;
  });

  const llenar = (correo = 'ana@gmail.com', contrasena = 'secreta123') => {
    escribir(/correo electrónico/i, correo);
    escribir(/contraseña/i, contrasena);
    fireEvent.click(botonEnviar());
  };

  it('envía correo y contraseña y lleva al panel del cliente', async () => {
    auth.login.mockResolvedValue({ id: 1, rol: 'cliente' });
    montar();
    llenar();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'));
    expect(auth.login).toHaveBeenCalledWith('ana@gmail.com', 'secreta123');
  });

  it('un administrador entra a /admin', async () => {
    auth.login.mockResolvedValue({ id: 9, rol: 'admin' });
    montar();
    llenar('admin@urbify.co');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/admin'));
  });

  it('muestra el error del servidor con credenciales incorrectas, no navega y deja reintentar', async () => {
    auth.login.mockRejectedValue({ response: { status: 401, data: { error: 'Correo o contraseña incorrectos' } } });
    montar();
    llenar('ana@gmail.com', 'mala');
    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
    expect(botonEnviar().disabled).toBe(false);
  });

  it('muestra un mensaje genérico si el servidor no responde', async () => {
    auth.login.mockRejectedValue(new Error('sin red'));
    montar();
    llenar();
    expect(await screen.findByText('Error al iniciar sesión')).toBeTruthy();
  });

  it('con 429 muestra el bloqueo y la cuenta regresiva en minutos', async () => {
    auth.login.mockRejectedValue({
      response: { status: 429, data: { bloqueado: true, error: 'Demasiados intentos con esta cuenta', minutos_restantes: 1 } },
    });
    montar();
    llenar('ana@gmail.com', 'mala');
    expect(await screen.findByText('Demasiados intentos con esta cuenta')).toBeTruthy();
    expect(screen.getByText(/volver a intentarlo en 1 minuto$/i)).toBeTruthy();
  });

  it('si el correo no está verificado pasa a la pantalla del código', async () => {
    auth.login.mockRejectedValue({ response: { status: 403, data: { codigo: 'correo_no_verificado', correo: 'ana@gmail.com' } } });
    montar();
    llenar();
    expect(await screen.findByLabelText(/código de verificación/i)).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('con la sesión ya iniciada redirige en vez de mostrar el formulario', () => {
    auth.usuario = { id: 1, rol: 'cliente' };
    montar();
    expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });
});

describe('Auth – registro', () => {
  beforeEach(() => {
    navigate.mockReset();
    auth.registrar.mockReset();
    auth.usuario = null;
  });

  const llenarBase = () => {
    escribir(/^nombre$/i, 'Ana');
    escribir(/apellido/i, 'Gómez');
    escribir(/correo electrónico/i, 'Ana@Gmail.com ');
    escribir(/contraseña/i, 'secreta123');
  };
  const crearCuenta = () => fireEvent.click(botonEnviar());

  it('el teléfono solo acepta números, espacios y +', () => {
    montar('/registro');
    escribir(/teléfono/i, '+57 300-abc 123');
    expect(screen.getByLabelText(/teléfono/i).value).toBe('+57 300 123');
  });

  it('el campo de oficio aparece solo al elegir Proveedor y se borra al volver a Cliente', () => {
    montar('/registro');
    expect(screen.queryByLabelText(/oficio/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /proveedor/i }));
    escribir(/oficio/i, 'Plomero');
    fireEvent.click(screen.getByRole('button', { name: /^cliente$/i }));
    expect(screen.queryByLabelText(/oficio/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /proveedor/i }));
    expect(screen.getByLabelText(/oficio/i).value).toBe('');
  });

  it('al registrarse envía los datos y pide el código (sin iniciar sesión)', async () => {
    auth.registrar.mockResolvedValue({});
    montar('/registro');
    llenarBase();
    crearCuenta();
    expect(await screen.findByLabelText(/código de verificación/i)).toBeTruthy();
    expect(auth.registrar).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Ana', apellido: 'Gómez', correo: 'Ana@Gmail.com', contrasena: 'secreta123', rol: 'cliente',
    }));
    // El correo que se muestra está normalizado (minúsculas, sin espacios) y enmascarado.
    expect(screen.getByText('a***@gmail.com')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor al registrarse y no pide el código', async () => {
    auth.registrar.mockRejectedValue({ response: { status: 400, data: { error: 'El correo no es válido' } } });
    montar('/registro');
    llenarBase();
    crearCuenta();
    expect(await screen.findByText('El correo no es válido')).toBeTruthy();
    expect(screen.queryByLabelText(/código de verificación/i)).toBeNull();
  });

  it('muestra un mensaje genérico si el registro falla sin respuesta', async () => {
    auth.registrar.mockRejectedValue(new Error('sin red'));
    montar('/registro');
    llenarBase();
    crearCuenta();
    expect(await screen.findByText('Error al registrarse')).toBeTruthy();
  });
});
