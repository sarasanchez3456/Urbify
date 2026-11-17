// Pantalla del código de verificación (issue #7): el código se muestra SIEMPRE en mayúsculas, solo letras y números,
// máximo 6; el botón se activa con 6; los errores se muestran; el reenvío espera un minuto.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import VerificarCorreo from './VerificarCorreo';

const verificarCorreo = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ verificarCorreo }) }));
vi.mock('../api/axios', () => ({ default: { post: vi.fn() } }));
vi.mock('../utils/log', () => ({ logError: vi.fn() }));
import api from '../api/axios';

const campo = () => screen.getByLabelText(/código de verificación/i);
const botonVerificar = () => screen.getByRole('button', { name: /verificar y entrar/i });
const montar = (props = {}) => render(<VerificarCorreo correo="maria.lopez@gmail.com" onVolver={vi.fn()} onVerificado={vi.fn()} {...props} />);

describe('VerificarCorreo', () => {
  beforeEach(() => {
    verificarCorreo.mockReset();
    api.post.mockReset();
  });

  it('confirma a qué correo se envió, sin mostrarlo entero', () => {
    montar();
    expect(screen.getByText('m***@gmail.com')).toBeTruthy();
    expect(screen.queryByText(/maria\.lopez/)).toBeNull();
  });

  it('convierte lo escrito a MAYÚSCULAS, quita espacios y guiones y limita a 6 caracteres', () => {
    montar();
    fireEvent.change(campo(), { target: { value: 'ab-c 2 34xyz' } });
    expect(campo().value).toBe('ABC234');
  });

  it('el botón se activa solo cuando hay 6 caracteres', () => {
    montar();
    expect(botonVerificar().disabled).toBe(true);
    fireEvent.change(campo(), { target: { value: 'ABC23' } });
    expect(botonVerificar().disabled).toBe(true);
    fireEvent.change(campo(), { target: { value: 'abc234' } });
    expect(botonVerificar().disabled).toBe(false);
  });

  it('al verificar manda correo y código en mayúsculas, y avisa con el usuario devuelto', async () => {
    const onVerificado = vi.fn();
    verificarCorreo.mockResolvedValue({ id: 3, rol: 'cliente' });
    montar({ onVerificado });
    fireEvent.change(campo(), { target: { value: 'abc234' } });
    fireEvent.click(botonVerificar());
    await waitFor(() => expect(onVerificado).toHaveBeenCalledWith({ id: 3, rol: 'cliente' }));
    expect(verificarCorreo).toHaveBeenCalledWith('maria.lopez@gmail.com', 'ABC234');
  });

  it('si el código es incorrecto muestra el mensaje del servidor y no continúa', async () => {
    const onVerificado = vi.fn();
    verificarCorreo.mockRejectedValue({ response: { data: { error: 'Código inválido o vencido' } } });
    montar({ onVerificado });
    fireEvent.change(campo(), { target: { value: 'AAAAAA' } });
    fireEvent.click(botonVerificar());
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/inválido o vencido/i);
    expect(onVerificado).not.toHaveBeenCalled();
    expect(botonVerificar().disabled).toBe(false); // se puede volver a intentar
  });

  it('muestra un mensaje genérico si el servidor no responde', async () => {
    verificarCorreo.mockRejectedValue(new Error('sin red'));
    montar();
    fireEvent.change(campo(), { target: { value: 'AAAAAA' } });
    fireEvent.click(botonVerificar());
    expect((await screen.findByRole('alert')).textContent).toMatch(/no se pudo verificar/i);
  });

  it('el reenvío espera un minuto después del primer envío', () => {
    montar();
    const reenviar = screen.getByRole('button', { name: /enviar otro código/i });
    expect(reenviar.disabled).toBe(true);
    expect(reenviar.textContent).toMatch(/60 s/);
  });

  it('si la cuenta ya existía sin verificar (viene del inicio de sesión) pide un código nuevo al abrir, una sola vez', async () => {
    api.post.mockResolvedValue({ data: {} });
    const { rerender } = montar({ enviarAlAbrir: true });
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/reenviar-codigo', { correo: 'maria.lopez@gmail.com' }));
    rerender(<VerificarCorreo correo="maria.lopez@gmail.com" enviarAlAbrir onVolver={vi.fn()} onVerificado={vi.fn()} />);
    await act(async () => {});
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('"Volver" regresa a la pantalla anterior', () => {
    const onVolver = vi.fn();
    montar({ onVolver });
    fireEvent.click(screen.getByRole('button', { name: /volver/i }));
    expect(onVolver).toHaveBeenCalled();
  });
});
