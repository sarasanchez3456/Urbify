import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuth = location.pathname === '/login' || location.pathname === '/registro';
  const linkColor = isAuth ? "rgba(255,255,255,0.6)" : "oklch(0.35 0.05 240)";
  const linkHover = isAuth ? "#fff" : "oklch(0.40 0.18 255)";
  const logoMain = isAuth ? "rgba(255,255,255,0.9)" : "oklch(0.20 0.08 240)";
  const logoAccent = isAuth ? "oklch(0.72 0.13 200)" : "oklch(0.40 0.18 255)";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between"
      style={{
        padding: "0 52px",
        height: "80px",
        background: "white",
      }}
    >
      <Link to="/" className="logo no-underline relative" style={{ fontFamily: "'DM Serif Display', 'Playfair Display', serif", fontWeight: 800, fontSize: "1.3rem", letterSpacing: "0.05em" }}>
        <span style={{ color: logoMain }}>urb</span><span style={{ color: logoAccent }}>ify</span>
      </Link>

      <ul className="nav-links flex gap-[36px] list-none m-0 p-0">
        <li>
          <Link to={usuario ? "/buscar" : "/login"} className="no-underline" style={{ color: linkColor, fontSize: "0.78rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500, transition: "color 0.2s", fontFamily: "'Fira Sans', sans-serif" }}
            onMouseEnter={e => e.target.style.color = linkHover}
            onMouseLeave={e => e.target.style.color = linkColor}
          >
            Buscar
          </Link>
        </li>
        <li>
          <Link to={usuario ? "/mapa" : "/login"} className="no-underline" style={{ color: linkColor, fontSize: "0.78rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500, transition: "color 0.2s", fontFamily: "'Fira Sans', sans-serif" }}
            onMouseEnter={e => e.target.style.color = linkHover}
            onMouseLeave={e => e.target.style.color = linkColor}
          >
            Mapa
          </Link>
        </li>
        <li>
          <span
            onClick={() => {
              if (window.location.pathname !== '/') {
                navigate('/');
                setTimeout(() => {
                  document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 150);
              } else {
                document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="no-underline cursor-pointer"
            style={{ color: linkColor, fontSize: "0.78rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500, transition: "color 0.2s", fontFamily: "'Fira Sans', sans-serif" }}
            onMouseEnter={e => e.target.style.color = linkHover}
            onMouseLeave={e => e.target.style.color = linkColor}
          >
            Cómo Funciona
          </span>
        </li>
      </ul>

      {!isAuth && (
        <div className="nav-ctas flex gap-[10px]">
          {usuario ? (
            <>
              <Link to="/perfil">
                <button className="nav-btn-outline">Perfil</button>
              </Link>
              <button onClick={logout} className="nav-btn-primary">Salir</button>
            </>
          ) : (
            <>
              <Link to="/login">
                <button className="nav-btn-outline">Ingresar</button>
              </Link>
              <Link to="/registro">
                <button className="nav-btn-primary">Registrarse</button>
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
