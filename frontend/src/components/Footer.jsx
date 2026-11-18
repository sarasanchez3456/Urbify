import { Link } from 'react-router-dom';
import './Footer.css';

// Pie de página público (issue #75). Solo se muestra fuera del panel y de la pantalla de acceso.
export function Footer() {
  const anio = new Date().getFullYear();

  return (
    <footer className="ft" aria-label="Información de Urbify">
      <div className="ft-contenido">
        <div className="ft-marca">
          <Link to="/" className="ft-logo" aria-label="Urbify, ir al inicio">
            <span>urb</span>
            <span>ify</span>
          </Link>
          <p>Servicios para el hogar, con profesionales cerca de ti.</p>
        </div>

        <nav className="ft-enlaces" aria-label="Información legal y contacto">
          <Link to="/terminos">Términos y condiciones</Link>
          <Link to="/privacidad">Política de privacidad</Link>
          <Link to="/contacto">Contacto</Link>
        </nav>
      </div>

      <p className="ft-derechos">© {anio} Urbify. Todos los derechos reservados.</p>
    </footer>
  );
}
