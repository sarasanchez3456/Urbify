import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './NoEncontrada.css';

// Pantalla para cualquier dirección que no existe. El servidor ya responde 404 en JSON para /api: esto es solo de la web.
export default function NoEncontrada() {
  const { usuario } = useAuth();
  const inicio = usuario ? (usuario.rol === 'admin' ? '/admin' : '/dashboard') : '/';
  return (
    <section className="nf" aria-labelledby="nf-titulo">
      <p className="nf-codigo" aria-hidden="true">404</p>
      <h1 id="nf-titulo">No encontramos esta página</h1>
      <p className="nf-texto">La dirección que escribiste no existe o ya cambió de lugar.</p>
      <div className="nf-acciones">
        <Link to={inicio} className="nf-btn nf-btn--principal">{usuario ? 'Ir a mi inicio' : 'Ir al inicio'}</Link>
        <Link to="/buscar" className="nf-btn">Buscar servicios</Link>
      </div>
    </section>
  );
}
