// Ruta protegida (issue #7): sin sesión va al login; con el rol equivocado va al inicio de su modo, nunca a una página
// en blanco ni a una pantalla ajena.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

let sesion = {};
vi.mock('./context/AuthContext', () => ({ useAuth: () => sesion }));
// App.jsx importa todas las páginas; aquí solo interesa RutaProtegida, así que se cargan vacías.
vi.mock('./components/Navbar', () => ({ Navbar: () => null }));
vi.mock('./components/Background', () => ({ Background: () => null }));
vi.mock('./api/axios', () => ({ setOnUnauthorized: vi.fn(), default: {} }));
vi.mock('./pages/Home', () => ({ default: () => null }));
vi.mock('./pages/Auth', () => ({ default: () => null }));
vi.mock('./pages/Buscar', () => ({ default: () => null }));
vi.mock('./pages/ServicioDetalle', () => ({ default: () => null }));
vi.mock('./pages/Perfil', () => ({ default: () => null }));
vi.mock('./pages/MisServicios', () => ({ default: () => null }));
vi.mock('./pages/MisSolicitudes', () => ({ default: () => null }));
vi.mock('./pages/MiAgenda', () => ({ default: () => null }));
vi.mock('./pages/NoEncontrada', () => ({ default: () => null }));
vi.mock('./pages/Ingresos', () => ({ default: () => null }));
vi.mock('./pages/Dashboard', () => ({ default: () => null }));
vi.mock('./pages/AdminPanel', () => ({ default: () => null }));
import { RutaProtegida } from './App';

const montar = (rol) => render(
  <MemoryRouter initialEntries={['/secreto']}>
    <Routes>
      <Route path="/login" element={<p>PANTALLA LOGIN</p>} />
      <Route path="/dashboard" element={<p>INICIO DASHBOARD</p>} />
      <Route path="/admin" element={<p>INICIO ADMIN</p>} />
      <Route path="/secreto" element={<RutaProtegida rol={rol}><p>CONTENIDO PRIVADO</p></RutaProtegida>} />
    </Routes>
  </MemoryRouter>,
);

describe('RutaProtegida', () => {
  it('mientras se restaura la sesión no muestra nada (ni el contenido ni el login)', () => {
    sesion = { usuario: null, cargando: true };
    const { container } = montar();
    expect(container.textContent).toBe('');
  });

  it('sin sesión lleva al login y no muestra el contenido', () => {
    sesion = { usuario: null, cargando: false };
    montar();
    expect(screen.getByText('PANTALLA LOGIN')).toBeTruthy();
    expect(screen.queryByText('CONTENIDO PRIVADO')).toBeNull();
  });

  it('con sesión y sin rol exigido muestra el contenido', () => {
    sesion = { usuario: { rol: 'cliente' }, cargando: false };
    montar();
    expect(screen.getByText('CONTENIDO PRIVADO')).toBeTruthy();
  });

  it('con el rol correcto muestra el contenido', () => {
    sesion = { usuario: { rol: 'proveedor' }, cargando: false };
    montar('proveedor');
    expect(screen.getByText('CONTENIDO PRIVADO')).toBeTruthy();
  });

  it('un cliente que entra a una ruta de proveedor vuelve a su inicio y no ve el contenido', () => {
    sesion = { usuario: { rol: 'cliente' }, cargando: false };
    montar('proveedor');
    expect(screen.getByText('INICIO DASHBOARD')).toBeTruthy();
    expect(screen.queryByText('CONTENIDO PRIVADO')).toBeNull();
  });

  it('un cliente que intenta entrar a una ruta de administrador va a su inicio, no al panel', () => {
    sesion = { usuario: { rol: 'cliente' }, cargando: false };
    montar('admin');
    expect(screen.queryByText('CONTENIDO PRIVADO')).toBeNull();
    expect(screen.getByText('INICIO DASHBOARD')).toBeTruthy();
  });

  it('un administrador en una ruta de proveedor va a su propio inicio (/admin)', () => {
    sesion = { usuario: { rol: 'admin' }, cargando: false };
    montar('proveedor');
    expect(screen.getByText('INICIO ADMIN')).toBeTruthy();
  });
});
