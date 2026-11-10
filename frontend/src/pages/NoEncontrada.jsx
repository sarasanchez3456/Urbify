import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Globe } from "../components/ui/cosmic-404";
import "./NoEncontrada.css";

const subir = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: "easeOut" } },
};

const globo = {
  hidden: { scale: 0.85, opacity: 0, y: 10 },
  visible: { scale: 1, opacity: 1, y: 0, transition: { duration: 1, ease: "easeOut" } },
  flotando: { y: [-5, 5], transition: { duration: 5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" } },
};

// Pantalla para cualquier dirección que no existe. Ocupa toda la pantalla (tapa la barra superior a propósito: es una
// página aparte, como la de acceso). El servidor ya responde 404 en JSON para /api; esto es solo de la web.
export default function NoEncontrada() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const inicio = usuario ? (usuario.rol === "admin" ? "/admin" : "/dashboard") : "/";

  const volver = () => {
    // Si hay una página anterior de Urbify se vuelve a ella; si se llegó directo a la dirección, al inicio.
    if (window.history.length > 1) navigate(-1);
    else navigate(inicio);
  };

  // Se dibuja en el <body> para quedar por encima de la barra superior (que vive fuera del contenido principal).
  return createPortal(
    <main className="nf" aria-labelledby="nf-titulo">
      <div className="nf-estrellas" aria-hidden="true" />
      <motion.div className="nf-contenido" initial="hidden" animate="visible" variants={subir}>
        <div className="nf-codigo" role="img" aria-label="Error 404">
          <motion.span variants={subir} aria-hidden="true">4</motion.span>
          <motion.div className="nf-globo" variants={globo} animate={["visible", "flotando"]} aria-hidden="true">
            <Globe />
          </motion.div>
          <motion.span variants={subir} aria-hidden="true">4</motion.span>
        </div>

        <motion.h1 id="nf-titulo" variants={subir}>¡Ups! Te perdiste en el espacio</motion.h1>
        <motion.p className="nf-texto" variants={subir}>
          No encontramos la página que buscas. Puede que haya cambiado de lugar o que la dirección esté mal escrita.
        </motion.p>

        <motion.div className="nf-acciones" variants={subir}>
          <button type="button" className="nf-btn nf-btn--principal" onClick={volver}>
            <ArrowLeft size={18} aria-hidden="true" />
            Volver
          </button>
          <Link to={inicio} className="nf-btn">{usuario ? "Ir a mi inicio" : "Ir al inicio"}</Link>
        </motion.div>
      </motion.div>
    </main>,
    document.body
  );
}
