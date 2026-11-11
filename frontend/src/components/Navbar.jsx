import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import "./Navbar.css";

export function Navbar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuth = location.pathname === '/login' || location.pathname === '/registro';

  const irAComoFunciona = () => {
    const bajar = () => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.location.pathname !== '/' && !window.location.hash.endsWith('#/')) {
      navigate('/');
      setTimeout(bajar, 150);
    } else {
      bajar();
    }
  };

  return (
    <nav className={`nb${isAuth ? ' nb--oscuro' : ''}`} aria-label="Principal">
      <Link to="/" className="nb-logo"><span>urb</span><span>ify</span></Link>

      <ul className="nb-links">
        <li><Link to="/buscar">Buscar</Link></li>
        <li><button type="button" onClick={irAComoFunciona}>Cómo funciona</button></li>
      </ul>

      {!isAuth && (
        <div className="nb-ctas">
          {usuario ? (
            <>
              <NotificationBell />
              <Link to="/perfil" className="nb-btn">Perfil</Link>
              <button type="button" onClick={logout} className="nb-btn nb-btn--principal">Salir</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nb-btn">Ingresar</Link>
              <Link to="/registro" className="nb-btn nb-btn--principal">Registrarse</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
