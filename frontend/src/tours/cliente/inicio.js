import { Bell, ClipboardList, Compass, LayoutDashboard, Search, Sparkles, UserRound } from 'lucide-react';
import { crearTour } from '../crearTour';

const pasos = [
  {
    selector: '[data-tour="cliente-bienvenida"]',
    icono: Sparkles,
    titulo: 'Bienvenido a Urbify',
    descripcion: 'Te mostraremos rápidamente cómo encontrar profesionales y administrar tus servicios.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="cliente-buscador"]',
    icono: Search,
    titulo: 'Busca un servicio',
    descripcion: 'Escribe el servicio que necesitas para encontrar profesionales disponibles.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="nav-mis-solicitudes"]',
    icono: ClipboardList,
    titulo: 'Mis Solicitudes',
    descripcion: 'Revisa el estado y los detalles de los servicios que has solicitado.',
    lado: 'right',
    requiereSidebar: true,
  },
  {
    selector: '[data-tour="nav-buscar-servicios"]',
    icono: Compass,
    titulo: 'Buscar Servicios',
    descripcion: 'Explora profesionales y servicios para encontrar la ayuda que necesitas.',
    lado: 'right',
    requiereSidebar: true,
  },
  {
    selector: '[data-tour="notificaciones"]',
    icono: Bell,
    titulo: 'Notificaciones',
    descripcion: 'Consulta aquí las actualizaciones importantes de tus servicios.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="perfil-usuario"]',
    icono: UserRound,
    titulo: 'Mi Perfil',
    descripcion: 'Desde aquí puedes ver y actualizar la información de tu cuenta.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="navegacion-principal"]',
    icono: LayoutDashboard,
    titulo: 'Navegación principal',
    descripcion: 'Desde este menú puedes acceder a las principales funciones de Urbify.',
    lado: 'right',
    requiereSidebar: true,
  },
];

export function iniciarTourInicioCliente({ controlarSidebar = () => Promise.resolve() } = {}) {
  const pasosDisponibles = pasos
    .filter(({ selector }) => document.querySelector(selector))
    .map(({ selector, titulo, descripcion, lado, requiereSidebar = false, icono }) => ({
      element: selector,
      requiereSidebar,
      icono,
      popover: {
        title: titulo,
        description: descripcion,
        side: lado,
        align: 'center',
      },
    }));

  if (pasosDisponibles.length === 0) return false;

  let cambiandoPaso = false;
  const cambiarPaso = async (driver, indice) => {
    if (cambiandoPaso) return;
    cambiandoPaso = true;
    try {
      await controlarSidebar(pasosDisponibles[indice]?.requiereSidebar);
      if (driver.isActive()) driver.moveTo(indice);
    } finally {
      cambiandoPaso = false;
    }
  };

  const pasosConNavegacion = pasosDisponibles.map((paso, indice) => ({
    ...paso,
    popover: {
      ...paso.popover,
      ...(indice > 0 && {
        onPrevClick: (_elemento, _paso, { driver }) => cambiarPaso(driver, indice - 1),
      }),
      ...(indice < pasosDisponibles.length - 1 && {
        onNextClick: (_elemento, _paso, { driver }) => cambiarPaso(driver, indice + 1),
      }),
    },
  }));

  const tour = crearTour(pasosConNavegacion, {
    iconos: pasosConNavegacion.map(({ icono }) => icono),
    onDestroyed: () => {
      controlarSidebar(false);
    },
  });

  controlarSidebar(false).then(() => tour.drive());
  return true;
}
