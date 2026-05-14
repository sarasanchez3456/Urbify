import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          Urbify
        </Link>

        <div className="navbar-links">
          <Link to="/buscar" className="nav-link">Buscar</Link>
          <Link to="/mapa" className="nav-link">Mapa</Link>

          {!usuario ? (
            <>
              <Link to="/login" className="nav-link">Iniciar Sesión</Link>
              <Link to="/registro" className="btn btn-primary btn-sm">Registrarse</Link>
            </>
          ) : (
            <>
              <Link to="/perfil" className="nav-link">Mi Perfil</Link>
              {usuario.rol === 'proveedor' && (
                <Link to="/mis-servicios" className="nav-link">Mis Servicios</Link>
              )}
              {usuario.rol === 'cliente' && (
                <Link to="/mis-solicitudes" className="nav-link">Mis Solicitudes</Link>
              )}
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Cerrar Sesión
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
