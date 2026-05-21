import React from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-[52px] py-[18px] bg-[rgba(4,6,15,0.82)] backdrop-blur-[24px] border-b border-[var(--gborder)]">
      <Link to="/" className="logo no-underline font-['Orbitron'] font-[900] text-[1.45rem] text-[var(--cyan)] tracking-[5px] relative">
        URBIFY<span className="text-[var(--orange)] text-[0.5rem] align-super ml-[2px]">●</span>
      </Link>
      
      <ul className="nav-links flex gap-[36px] list-none m-0 p-0">
        <li><Link to="/buscar" className="no-underline color-[rgba(224,238,255,0.5)] text-[0.8rem] tracking-[2.5px] uppercase font-[600] transition-colors duration-200 hover:text-[var(--cyan)]">Buscar</Link></li>
        <li><Link to="/mapa" className="no-underline color-[rgba(224,238,255,0.5)] text-[0.8rem] tracking-[2.5px] uppercase font-[600] transition-colors duration-200 hover:text-[var(--cyan)]">Mapa</Link></li>
        <li><a href="#como-funciona" className="no-underline color-[rgba(224,238,255,0.5)] text-[0.8rem] tracking-[2.5px] uppercase font-[600] transition-colors duration-200 hover:text-[var(--cyan)]">Cómo Funciona</a></li>
      </ul>

      <div className="nav-ctas flex gap-[10px]">
        {usuario ? (
          <>
            <Link to="/perfil">
              <button className="nbtn nbtn-outline cursor-none">Perfil</button>
            </Link>
            <button onClick={logout} className="nbtn nbtn-fill cursor-none">Salir</button>
          </>
        ) : (
          <>
            <Link to="/login">
              <button className="nbtn nbtn-outline cursor-none">Ingresar</button>
            </Link>
            <Link to="/registro">
              <button className="nbtn nbtn-fill cursor-none">Registrarse</button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
