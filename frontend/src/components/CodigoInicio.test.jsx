// Código de inicio del servicio (issue #57): tarjeta del cliente y formulario del proveedor.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../api/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../utils/log', () => ({ logError: vi.fn() }));
import api from '../api/axios';
import { TarjetaCodigoCliente, IniciarConCodigo } from './CodigoInicio';

const datos = (extra = {}) => ({ data: { codigo: '482913', intentos_restantes: 5, bloqueado: false, obligatorio: true, ...extra } });

describe('TarjetaCodigoCliente', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
  });

  it('muestra el código de la solicitud en dos grupos y explica cuándo darlo', async () => {
    api.get.mockResolvedValue(datos());
    render(<TarjetaCodigoCliente solicitudId={7} />);
    expect(await screen.findByLabelText('Código de inicio: 4 8 2 9 1 3')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/solicitudes/7/codigo-inicio');
    expect(screen.getByText(/cuando llegue/i)).toBeTruthy();
    expect(screen.queryByText(/se escribió mal/i)).toBeNull();
  });

  it('avisa cuántas veces se escribió mal', async () => {
    api.get.mockResolvedValue(datos({ intentos_restantes: 3 }));
    render(<TarjetaCodigoCliente solicitudId={7} />);
    expect(await screen.findByText(/se escribió mal 2 veces\. quedan 3 intentos/i)).toBeTruthy();
  });

  it('bloqueado: no muestra el código y permite generar uno nuevo', async () => {
    api.get.mockResolvedValue(datos({ bloqueado: true, intentos_restantes: 0 }));
    api.post.mockResolvedValue(datos({ codigo: '100200' }));
    render(<TarjetaCodigoCliente solicitudId={7} />);
    expect(await screen.findByText(/se bloqueó/i)).toBeTruthy();
    expect(screen.queryByLabelText(/código de inicio: 4/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /generar un código nuevo/i }));
    expect(await screen.findByLabelText('Código de inicio: 1 0 0 2 0 0')).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/solicitudes/7/codigo-inicio');
  });

  it('muestra el error del servidor si no se puede generar uno nuevo', async () => {
    api.get.mockResolvedValue(datos());
    api.post.mockRejectedValue({ response: { status: 429, data: { error: 'Generaste demasiados códigos nuevos.' } } });
    render(<TarjetaCodigoCliente solicitudId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: /generar un código nuevo/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/demasiados códigos/i);
  });

  it('no se muestra si el código no es obligatorio', async () => {
    api.get.mockResolvedValue(datos({ obligatorio: false }));
    const { container } = render(<TarjetaCodigoCliente solicitudId={7} />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(container.innerHTML).toBe('');
  });

  it('si falla la carga ofrece reintentar', async () => {
    api.get.mockRejectedValueOnce(new Error('sin red')).mockResolvedValue(datos());
    render(<TarjetaCodigoCliente solicitudId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: /reintentar/i }));
    expect(await screen.findByLabelText(/código de inicio: 4/i)).toBeTruthy();
  });
});

describe('IniciarConCodigo', () => {
  const campo = () => screen.getByLabelText(/código de inicio/i);
  const boton = () => screen.getByRole('button', { name: /iniciar servicio/i });

  it('solo acepta dígitos, hasta 6, y se activa con 6', () => {
    render(<IniciarConCodigo onIniciar={vi.fn()} onCancelar={vi.fn()} procesando={false} />);
    expect(boton().disabled).toBe(true);
    fireEvent.change(campo(), { target: { value: '48a-29 1399' } });
    expect(campo().value).toBe('482913');
    expect(boton().disabled).toBe(false);
  });

  it('envía el código y lo borra si el servidor lo rechaza', async () => {
    const onIniciar = vi.fn().mockResolvedValue(false);
    render(<IniciarConCodigo onIniciar={onIniciar} onCancelar={vi.fn()} procesando={false} />);
    fireEvent.change(campo(), { target: { value: '482913' } });
    fireEvent.click(boton());
    await waitFor(() => expect(onIniciar).toHaveBeenCalledWith('482913'));
    await waitFor(() => expect(campo().value).toBe(''));
  });

  it('Volver cancela', () => {
    const onCancelar = vi.fn();
    render(<IniciarConCodigo onIniciar={vi.fn()} onCancelar={onCancelar} procesando={false} />);
    fireEvent.click(screen.getByRole('button', { name: /volver/i }));
    expect(onCancelar).toHaveBeenCalled();
  });
});
