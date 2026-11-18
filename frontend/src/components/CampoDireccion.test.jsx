// Campo de dirección: se elige de la lista, se guardan las coordenadas y se muestra la ciudad donde quedó.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CampoDireccion from './CampoDireccion';

const RESPUESTA = [{
  display_name: 'Calle 52A, Belén, Medellín, Antioquia, Colombia', lat: '6.2258', lon: '-75.6004',
  address: { city: 'Medellín', state: 'Antioquia' },
}];

function Caja({ alUbicar }) {
  const [texto, setTexto] = useState('');
  const [c, setC] = useState(null);
  return <CampoDireccion id="d" value={texto} onTexto={setTexto} onUbicacion={(u) => { setC(u); alUbicar(u); }} lat={c?.lat} lng={c?.lng} />;
}

afterEach(() => vi.unstubAllGlobals());

describe('CampoDireccion', () => {
  it('pide elegir una opción y, al elegirla, guarda las coordenadas y muestra la ciudad', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => ({
      ok: true,
      json: async () => (String(url).includes('/reverse') ? { address: { city: 'Medellín' } } : RESPUESTA),
    })));
    const alUbicar = vi.fn();
    render(<Caja alUbicar={alUbicar} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Calle 52A #56-42, Medellín' } });
    expect(await screen.findByText(/Elige tu dirección de la lista|Buscando/)).toBeTruthy();
    fireEvent.mouseDown(await screen.findByRole('button', { name: /Calle 52A, Belén/ }));
    await waitFor(() => expect(alUbicar).toHaveBeenLastCalledWith({ lat: 6.2258, lng: -75.6004 }));
    expect(await screen.findByText(/Ubicada en el mapa.*Medellín/)).toBeTruthy();
  });

  it('si escribe de nuevo, la dirección vuelve a quedar sin confirmar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => RESPUESTA })));
    const alUbicar = vi.fn();
    render(<Caja alUbicar={alUbicar} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Calle 52A #56-42, Medellín' } });
    fireEvent.mouseDown(await screen.findByRole('button', { name: /Calle 52A, Belén/ }));
    await screen.findByText(/Ubicada en el mapa/);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Otra calle 1' } });
    expect(alUbicar).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText(/Ubicada en el mapa/)).toBeNull();
  });
});
