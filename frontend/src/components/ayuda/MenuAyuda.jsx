import { useEffect } from 'react';
import { PlayCircle, X } from 'lucide-react';
import { iniciarTourInicioCliente } from '../../tours/cliente/inicio';
import { iniciarTourBuscarServicios } from '../../tours/cliente/buscarServicios';
import { iniciarTourMisSolicitudes } from '../../tours/cliente/misSolicitudes';
import { iniciarTourPerfilCliente } from '../../tours/cliente/perfil';

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

  const recorridos = {
    '/dashboard': {
      titulo: 'Inicio del cliente',
      iniciar: () => iniciarTourInicioCliente({ controlarSidebar: controlarSidebarTour }),
    },
    '/buscar': {
      titulo: 'Buscar Servicios',
      iniciar: iniciarTourBuscarServicios,
    },
    '/mis-solicitudes': {
      titulo: 'Mis Solicitudes',
      iniciar: iniciarTourMisSolicitudes,
    },
    '/perfil': {
      titulo: 'Mi Perfil',
      iniciar: iniciarTourPerfilCliente,
    },
  };
  const recorrido = usuario?.rol === 'cliente' ? recorridos[rutaActual] : null;
  const iniciarTour = () => {
    onCerrar();
    recorrido?.iniciar();
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

        {recorrido ? (
          <div className="ayuda-opciones">
            <button type="button" className="ayuda-opcion" onClick={iniciarTour}>
              <PlayCircle size={18} aria-hidden="true" />
              <span>Recorrido de esta página</span>
            </button>
            <button type="button" className="ayuda-opcion" onClick={iniciarTour}>
              <PlayCircle size={18} aria-hidden="true" />
              <span>{recorrido.titulo}</span>
            </button>
          </div>
        ) : (
          <p className="ayuda-sin-tour">Todavía no hay un recorrido disponible para esta sección.</p>
        )}
      </section>
    </>
  );
}
