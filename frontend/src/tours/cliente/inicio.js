import { crearTour } from '../crearTour';

const pasos = [
  {
    selector: '[data-tour="cliente-bienvenida"]',
    titulo: 'Bienvenido a Urbify',
    descripcion: 'Te mostraremos rápidamente cómo encontrar profesionales y administrar tus servicios.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="cliente-buscador"]',
    titulo: 'Busca un servicio',
    descripcion: 'Escribe el servicio que necesitas para encontrar profesionales disponibles.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="nav-mis-solicitudes"]',
    titulo: 'Mis Solicitudes',
    descripcion: 'Revisa el estado y los detalles de los servicios que has solicitado.',
    lado: 'right',
    requiereSidebar: true,
  },
  {
    selector: '[data-tour="nav-buscar-servicios"]',
    titulo: 'Buscar Servicios',
    descripcion: 'Explora profesionales y servicios para encontrar la ayuda que necesitas.',
    lado: 'right',
    requiereSidebar: true,
  },
  {
    selector: '[data-tour="notificaciones"]',
    titulo: 'Notificaciones',
    descripcion: 'Consulta aquí las actualizaciones importantes de tus servicios.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="perfil-usuario"]',
    titulo: 'Mi Perfil',
    descripcion: 'Desde aquí puedes ver y actualizar la información de tu cuenta.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="navegacion-principal"]',
    titulo: 'Navegación principal',
    descripcion: 'Desde este menú puedes acceder a las principales funciones de Urbify.',
    lado: 'right',
    requiereSidebar: true,
  },
];

export function iniciarTourInicioCliente({ controlarSidebar = () => Promise.resolve() } = {}) {
  const pasosDisponibles = pasos
    .filter(({ selector }) => document.querySelector(selector))
    .map(({ selector, titulo, descripcion, lado, requiereSidebar = false }) => ({
      element: selector,
      requiereSidebar,
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
    onDestroyed: () => {
      controlarSidebar(false);
    },
  });

  controlarSidebar(false).then(() => tour.drive());
  return true;
}
