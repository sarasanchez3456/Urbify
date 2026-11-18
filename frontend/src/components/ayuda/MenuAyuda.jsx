import { useEffect } from 'react';
import { PlayCircle, X } from 'lucide-react';
import { iniciarTourInicioCliente } from '../../tours/cliente/inicio';

export default function MenuAyuda({ abierto, onCerrar, usuario, rutaActual, controlarSidebarTour }) {
  useEffect(() => {
    if (!abierto) return undefined;

    const cerrarConEscape = (evento) => {
      if (evento.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', cerrarConEscape);
    return () => document.removeEventListener('keydown', cerrarConEscape);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const hayTourDisponible = usuario?.rol === 'cliente' && rutaActual === '/dashboard';
  const iniciarTour = () => {
    onCerrar();
    iniciarTourInicioCliente({ controlarSidebar: controlarSidebarTour });
  };

  return (
    <>
      <button
        type="button"
        className="ayuda-fondo"
        aria-label="Cerrar centro de ayuda"
        onClick={onCerrar}
      />
      <section className="ayuda-menu" role="dialog" aria-modal="false" aria-labelledby="ayuda-titulo">
        <div className="ayuda-menu-encabezado">
          <h2 id="ayuda-titulo">Centro de ayuda</h2>
          <button type="button" className="ayuda-cerrar" onClick={onCerrar} aria-label="Cerrar centro de ayuda">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {hayTourDisponible ? (
          <div className="ayuda-opciones">
            <button type="button" className="ayuda-opcion" onClick={iniciarTour}>
              <PlayCircle size={18} aria-hidden="true" />
              <span>Recorrido de esta página</span>
            </button>
            <button type="button" className="ayuda-opcion" onClick={iniciarTour}>
              <PlayCircle size={18} aria-hidden="true" />
              <span>Inicio del cliente</span>
            </button>
          </div>
        ) : (
          <p className="ayuda-sin-tour">Todavía no hay un recorrido disponible para esta sección.</p>
        )}
      </section>
    </>
  );
}
