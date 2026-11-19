import { CalendarDays, ClipboardList, MessageCircle, UserRound, Wrench } from 'lucide-react';
import { crearTour } from '../crearTour';

export const EVENTO_DETALLE_PROVEEDOR_ABIERTO = 'urbify:detalle-proveedor-abierto';

const pasos = [
  {
    selector: '[data-tour="proveedor-solicitudes-inicio"]',
    icono: ClipboardList,
    titulo: 'Mis Solicitudes',
    descripcion: 'Aquí gestionas las solicitudes que recibes de tus clientes.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-filtros"]',
    icono: ClipboardList,
    titulo: 'Consulta por estado',
    descripcion: 'Usa estos filtros para ver solicitudes en curso, completadas o canceladas.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-listado"]',
    icono: ClipboardList,
    titulo: 'Listado de solicitudes',
    descripcion: 'Aquí aparecen las solicitudes que recibiste, agrupadas según el filtro y su estado.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-informacion"]',
    icono: CalendarDays,
    titulo: 'Información principal',
    descripcion: 'En cada solicitud revisa el servicio, el cliente, la visita y la dirección cuando corresponda.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-estado"]',
    icono: CalendarDays,
    titulo: 'Estado de la solicitud',
    descripcion: 'El estado indica si debes responder, si el trabajo está en curso o si ya terminó.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-acciones"]',
    icono: Wrench,
    titulo: 'Gestiona la solicitud',
    descripcion: 'Las acciones cambian según el estado: podrás responder, atender un cambio de fecha, iniciar o marcar el trabajo como completado cuando aplique.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-detalle"]',
    icono: ClipboardList,
    titulo: 'Ver detalle',
    descripcion: 'Pulsa Ver detalle para conocer el seguimiento, comunicarte con el cliente y revisar las acciones disponibles.',
    lado: 'left',
  },
];

const pasosDetalle = [
  {
    selector: '[data-tour="proveedor-solicitudes-detalle-cabecera"]',
    icono: ClipboardList,
    titulo: 'Resumen de la solicitud',
    descripcion: 'Aquí ves el estado actual, el servicio y la tarifa acordada.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-detalle-cambio"]',
    icono: CalendarDays,
    titulo: 'Cambio de fecha',
    descripcion: 'Cuando un cliente solicita cambiar la visita, revisa la propuesta y responde desde este aviso.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-detalle-seguimiento"]',
    icono: CalendarDays,
    titulo: 'Seguimiento',
    descripcion: 'Esta línea muestra el avance de la solicitud; una cancelada informa su estado aquí.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-detalle-cliente"]',
    icono: UserRound,
    titulo: 'Cliente',
    descripcion: 'Consulta quién solicitó el servicio; el teléfono y la reputación aparecen cuando están disponibles.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-detalle-datos"]',
    icono: ClipboardList,
    titulo: 'Lo que pidió el cliente',
    descripcion: 'Revisa la descripción, la dirección y la visita cuando esos datos estén disponibles.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-detalle-acciones"]',
    icono: Wrench,
    titulo: 'Acciones disponibles',
    descripcion: 'Según el estado podrás aceptar, rechazar, iniciar, completar o calificar al cliente cuando corresponda.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-detalle-chat"]',
    icono: MessageCircle,
    titulo: 'Comunícate con el cliente',
    descripcion: 'Usa este botón para abrir el chat y coordinar los detalles necesarios.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-solicitudes-detalle-calificar"]',
    icono: UserRound,
    titulo: 'Califica al cliente',
    descripcion: 'Al terminar el trabajo, esta opción aparece si aún puedes calificar al cliente.',
    lado: 'top',
  },
];

function avanzarSiFaltaElObjetivo(_elemento, _paso, { driver, index }) {
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

function iniciarTourDetalleProveedor() {
  const pasosDisponibles = pasosDetalle
    .filter(({ selector }) => document.querySelector(selector))
    .map(({ selector, titulo, descripcion, lado, icono }) => ({
      element: selector,
      icono,
      skipMissingElement: true,
      onElementMissing: avanzarSiFaltaElObjetivo,
      popover: {
        title: titulo,
        description: descripcion,
        side: lado,
        align: 'center',
      },
    }));

  if (pasosDisponibles.length === 0) return false;

  crearTour(pasosDisponibles, {
    iconos: pasosDisponibles.map(({ icono }) => icono),
    allowPageInteraction: true,
    disableActiveInteraction: false,
  }).drive();
  return true;
}

export function iniciarTourMisSolicitudesProveedor() {
  const pasosDisponibles = pasos
    .filter(({ selector }) => document.querySelector(selector))
    .map(({ selector, titulo, descripcion, lado, icono }) => ({
      element: selector,
      icono,
      popover: {
        title: titulo,
        description: descripcion,
        side: lado,
        align: 'center',
      },
    }));

  if (pasosDisponibles.length === 0) return false;

  let observadorPanel = null;
  let esperandoDetalle = false;
  let tour;

  const limpiar = () => {
    window.removeEventListener(EVENTO_DETALLE_PROVEEDOR_ABIERTO, continuarAlDetalle);
    if (!esperandoDetalle) observadorPanel?.disconnect();
  };

  const iniciarDetalleCuandoAparezca = () => {
    const panel = document.querySelector('[data-tour="proveedor-solicitudes-detalle-cabecera"]');
    if (!panel) return;
    observadorPanel?.disconnect();
    observadorPanel = null;
    esperandoDetalle = false;
    iniciarTourDetalleProveedor();
  };

  const continuarAlDetalle = () => {
    if (!tour?.isActive() || esperandoDetalle) return;
    esperandoDetalle = true;
    observadorPanel = new MutationObserver(iniciarDetalleCuandoAparezca);
    observadorPanel.observe(document.body, { childList: true, subtree: true });
    iniciarDetalleCuandoAparezca();
    tour.destroy();
  };

  tour = crearTour(pasosDisponibles, {
    iconos: pasosDisponibles.map(({ icono }) => icono),
    allowPageInteraction: true,
    disableActiveInteraction: false,
    onDestroyed: limpiar,
  });

  window.addEventListener(EVENTO_DETALLE_PROVEEDOR_ABIERTO, continuarAlDetalle);
  tour.drive();
  return true;
}
