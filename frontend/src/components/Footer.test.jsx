// Pie de página público (issue #75): los enlaces legales existen y llevan a su ruta.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from './Footer';
import { Terminos, Privacidad, Contacto } from '../pages/Legal';

const enRuta = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Footer', () => {
  it('muestra los tres enlaces con su ruta', () => {
    enRuta(<Footer />);
    expect(screen.getByRole('link', { name: 'Términos y condiciones' }).getAttribute('href')).toBe('/terminos');
    expect(screen.getByRole('link', { name: 'Política de privacidad' }).getAttribute('href')).toBe('/privacidad');
    expect(screen.getByRole('link', { name: 'Contacto' }).getAttribute('href')).toBe('/contacto');
  });

  it('muestra el año actual y la marca', () => {
    enRuta(<Footer />);
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Urbify`))).toBeTruthy();
    expect(screen.getByRole('link', { name: /Urbify, ir al inicio/i }).getAttribute('href')).toBe('/');
  });
});

describe('páginas legales', () => {
  it.each([
    ['Términos y condiciones', Terminos],
    ['Política de privacidad', Privacidad],
    ['Contacto', Contacto],
  ])('%s tiene su título y avisa que es un borrador', (titulo, Pagina) => {
    enRuta(<Pagina />);
    expect(screen.getByRole('heading', { level: 1, name: titulo })).toBeTruthy();
    expect(screen.getByRole('note').textContent).toMatch(/borrador/i);
  });

  it('Contacto muestra el correo como enlace mailto', () => {
    enRuta(<Contacto />);
    const enlace = screen.getByRole('link', { name: 'notificaciones@urbify.app' });
    expect(enlace.getAttribute('href')).toBe('mailto:notificaciones@urbify.app');
  });

  it('Contacto pide detalle del problema e indica el horario', () => {
    enRuta(<Contacto />);
    expect(screen.getByText(/con el mayor detalle posible/i)).toBeTruthy();
    expect(screen.getByText(/lunes a viernes, de 8:00 a\. m\. a 6:00 p\. m\./i)).toBeTruthy();
  });

  it('Privacidad cita la Ley 1581 de 2012 y el canal para ejercer los derechos', () => {
    enRuta(<Privacidad />);
    expect(screen.getByText(/Ley 1581 de 2012/)).toBeTruthy();
    expect(screen.getByText(/Superintendencia de Industria y Comercio/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'notificaciones@urbify.app' })).toBeTruthy();
  });
});
