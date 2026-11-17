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
  },
  {
    selector: '[data-tour="nav-buscar-servicios"]',
    titulo: 'Buscar Servicios',
    descripcion: 'Explora profesionales y servicios para encontrar la ayuda que necesitas.',
    lado: 'right',
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
  },
];

export function iniciarTourInicioCliente() {
  const pasosDisponibles = pasos
    .filter(({ selector }) => document.querySelector(selector))
    .map(({ selector, titulo, descripcion, lado }) => ({
      element: selector,
      popover: {
        title: titulo,
        description: descripcion,
        side: lado,
        align: 'center',
      },
    }));

  if (pasosDisponibles.length === 0) return false;

  crearTour(pasosDisponibles).drive();
  return true;
}
