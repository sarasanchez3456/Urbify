import { crearTour } from '../crearTour';

export const EVENTO_SOLICITUD_SERVICIO_ENVIADA = 'urbify:solicitud-servicio-enviada';

const pasos = [
  {
    selector: '[data-tour="servicio-detalle-inicio"]',
    titulo: 'Detalle del servicio',
    descripcion: 'En esta pantalla puedes revisar la información del servicio antes de solicitarlo.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="servicio-detalle-informacion"]',
    titulo: 'Información del servicio',
    descripcion: 'Comprueba el nombre, la categoría, la calificación y la información disponible del servicio.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="servicio-detalle-descripcion"]',
    titulo: 'Descripción',
    descripcion: 'Revisa qué ofrece el profesional y el alcance que describe para este servicio.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="servicio-detalle-calificaciones"]',
    titulo: 'Calificaciones y comentarios',
    descripcion: 'Aquí puedes consultar las calificaciones y experiencias disponibles de otros clientes.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="servicio-detalle-profesional"]',
    titulo: 'Profesional',
    descripcion: 'Esta tarjeta identifica quién presta el servicio y muestra la información de contacto permitida para ti.',
    lado: 'left',
  },
  {
    selector: '[data-tour="servicio-detalle-tarifa"]',
    titulo: 'Tarifa',
    descripcion: 'Revisa el valor: según el servicio, Urbify puede mostrar una tarifa fija o por hora.',
    lado: 'left',
  },
  {
    selector: '[data-tour="servicio-detalle-solicitud"]',
    titulo: 'Solicitar una cita',
    descripcion: 'Para solicitarla: describe lo que necesitas, escoge un horario disponible, indica la dirección y envía la solicitud.',
    lado: 'left',
  },
  {
    selector: '[data-tour="servicio-detalle-descripcion-solicitud"]',
    titulo: 'Describe lo que necesitas',
    descripcion: 'Da al profesional el contexto suficiente sobre el problema o el trabajo que necesitas.',
    lado: 'left',
  },
  {
    selector: '[data-tour="servicio-detalle-agenda"]',
    titulo: 'Día y hora',
    descripcion: 'Escoge una franja disponible en la agenda del profesional.',
    lado: 'left',
  },
  {
    selector: '[data-tour="servicio-detalle-direccion"]',
    titulo: 'Dirección',
    descripcion: 'Indica dónde se realizará el servicio. Puedes escribir la dirección y usar las funciones disponibles normalmente.',
    lado: 'left',
  },
  {
    selector: '[data-tour="servicio-detalle-ubicacion"]',
    titulo: 'Usar mi ubicación',
    descripcion: 'Esta alternativa opcional puede ayudarte a completar la ubicación del servicio.',
    lado: 'left',
  },
  {
    selector: '[data-tour="servicio-detalle-enviar"]',
    titulo: 'Enviar solicitud',
    descripcion: 'Cuando hayas completado la descripción, seleccionado un horario y definido una dirección válida, este botón se habilitará para enviar la solicitud al profesional.',
    lado: 'top',
  },
];

function avanzarSiDesapareceElObjetivo(_elemento, _paso, { driver, index }) {
  const pasosTour = driver.getConfig().steps || [];
  const indiceActual = index ?? driver.getActiveIndex() ?? -1;

  for (let siguiente = indiceActual + 1; siguiente < pasosTour.length; siguiente += 1) {
    const objetivo = pasosTour[siguiente].element;
    if (typeof objetivo === 'string' && document.querySelector(objetivo)) {
      driver.moveTo(siguiente);
      return;
    }
  }

  driver.destroy();
}

export function iniciarTourSolicitarServicio() {
  const pasosTour = pasos.map(({ selector, titulo, descripcion, lado }) => ({
    element: selector,
    skipMissingElement: true,
    onElementMissing: avanzarSiDesapareceElObjetivo,
    popover: {
      title: titulo,
      description: descripcion,
      side: lado,
      align: 'center',
    },
  }));

  if (!pasosTour.some(({ element }) => typeof element === 'string' && document.querySelector(element))) {
    return false;
  }

  let tour;
  const cerrarTrasSolicitud = () => {
    if (tour?.isActive()) tour.destroy();
  };

  tour = crearTour(pasosTour, {
    allowPageInteraction: true,
    disableActiveInteraction: false,
    onDestroyed: () => {
      window.removeEventListener(EVENTO_SOLICITUD_SERVICIO_ENVIADA, cerrarTrasSolicitud);
    },
  });

  window.addEventListener(EVENTO_SOLICITUD_SERVICIO_ENVIADA, cerrarTrasSolicitud);
  tour.drive();
  return true;
}
