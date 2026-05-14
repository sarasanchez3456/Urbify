import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

export default function Home() {
  const { usuario } = useAuth();

  return (
    <div className="home">
      <section className="hero">
        <div className="container">
          <h1>Encuentra al profesional ideal para tu hogar</h1>
          <p>
            Conectamos a clientes con trabajadores independientes calificados en
            electricidad, plomería, mecánica y más.
          </p>
          <div className="hero-buttons">
            <Link to="/buscar" className="btn btn-primary btn-lg">
              Buscar Servicios
            </Link>
            {!usuario && (
              <Link to="/registro" className="btn btn-secondary btn-lg">
                Crear Cuenta
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="container categories-section">
        <h2>Categorías Populares</h2>
        <div className="grid grid-3">
          {[
            { nombre: 'Electricidad', icono: '⚡' },
            { nombre: 'Plomería', icono: '🔧' },
            { nombre: 'Mecánica', icono: '🔩' },
            { nombre: 'Carpintería', icono: '🪚' },
            { nombre: 'Pintura', icono: '🎨' },
            { nombre: 'Jardinería', icono: '🌿' },
          ].map((cat) => (
            <Link key={cat.nombre} to={`/buscar?categoria=${cat.nombre}`} className="category-card card">
              <span className="category-icon">{cat.icono}</span>
              <h3>{cat.nombre}</h3>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
