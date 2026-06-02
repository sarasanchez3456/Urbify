import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between"
      style={{
        padding: "0 52px",
        height: "80px",
        background: "rgba(0, 23, 24, 0.82)",
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(169, 210, 182, 0.08)",
      }}
    >
      <Link to="/" className="logo no-underline relative" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: "1.3rem", color: "#a9d2b6", letterSpacing: "0.05em" }}>
        Urbify<span style={{ color: "#ff6b35", fontSize: "0.5rem", verticalAlign: "super", marginLeft: "2px" }}>●</span>
      </Link>
      
      <ul className="nav-links flex gap-[36px] list-none m-0 p-0">
        <li>
          <Link to="/buscar" className="no-underline" style={{ color: "rgba(205, 232, 232, 0.5)", fontSize: "0.78rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500, transition: "color 0.2s", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            onMouseEnter={e => e.target.style.color = "#a9d2b6"}
            onMouseLeave={e => e.target.style.color = "rgba(205, 232, 232, 0.5)"}
          >
            Buscar
          </Link>
        </li>
        <li>
          <Link to="/mapa" className="no-underline" style={{ color: "rgba(205, 232, 232, 0.5)", fontSize: "0.78rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500, transition: "color 0.2s", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            onMouseEnter={e => e.target.style.color = "#a9d2b6"}
            onMouseLeave={e => e.target.style.color = "rgba(205, 232, 232, 0.5)"}
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
            style={{ color: "rgba(205, 232, 232, 0.5)", fontSize: "0.78rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500, transition: "color 0.2s", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            onMouseEnter={e => e.target.style.color = "#a9d2b6"}
            onMouseLeave={e => e.target.style.color = "rgba(205, 232, 232, 0.5)"}
          >
            Cómo Funciona
          </span>
        </li>
      </ul>

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
    </nav>
  );
}
