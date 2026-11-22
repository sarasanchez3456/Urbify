import { BadgeDollarSign, ClipboardPenLine, FileText, List, Tags, Wrench } from 'lucide-react';
import { crearTour } from '../crearTour';

export const EVENTO_NUEVO_SERVICIO_PROVEEDOR_ABIERTO = 'urbify:nuevo-servicio-proveedor-abierto';
export const EVENTO_EDITAR_SERVICIO_PROVEEDOR_ABIERTO = 'urbify:editar-servicio-proveedor-abierto';

const pasosPantalla = [
  {
    selector: '[data-tour="proveedor-servicios-inicio"]',
    icono: Wrench,
    titulo: 'Mis Servicios',
    descripcion: 'Desde esta pantalla administras los servicios que ofreces a tus clientes.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="proveedor-servicios-vacio"]',
    icono: FileText,
    titulo: 'Tu primer servicio',
    descripcion: 'Cuando todavía no tienes servicios publicados, usa Crear servicio o el botón superior para comenzar.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-servicios-listado"]',
    icono: List,
    titulo: 'Servicios publicados',
    descripcion: 'Este listado reúne tus servicios; cada tarjeta conserva su propia información y acciones.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-servicios-informacion"]',
    icono: Tags,
    titulo: 'Información del servicio',
    descripcion: 'Cada tarjeta muestra la categoría, el título y la descripción que verán los clientes cuando esté disponible.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-servicios-tarifa"]',
    icono: BadgeDollarSign,
    titulo: 'Tarifa',
    descripcion: 'Aquí compruebas el valor publicado y si el cobro es por hora o a precio fijo.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-servicios-visibilidad"]',
    icono: Wrench,
    titulo: 'Visibilidad',
    descripcion: 'Usa este interruptor para pausar o volver a mostrar el servicio en las búsquedas de los clientes.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-acciones"]',
    icono: List,
    titulo: 'Acciones del servicio',
    descripcion: 'Desde aquí puedes editarlo, verlo como cliente o iniciar la eliminación cuando corresponda.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-editar"]',
    icono: ClipboardPenLine,
    titulo: 'Editar servicio',
    descripcion: 'Si quieres conocer el formulario de actualización, pulsa Editar. El recorrido no lo abre automáticamente.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-nuevo"]',
    icono: ClipboardPenLine,
    titulo: 'Publica un servicio',
    descripcion: 'Pulsa Nuevo servicio para abrir el formulario y contarle a los clientes qué ofreces.',
    lado: 'left',
  },
];

const pasosFormulario = [
  {
    selector: '[data-tour="proveedor-servicios-formulario-inicio"]',
    icono: ClipboardPenLine,
    titulo: 'Nuevo servicio',
    descripcion: 'Completa esta información para publicar un servicio. Puedes cerrar o cancelar el panel cuando quieras.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-formulario-categoria"]',
    icono: Tags,
    titulo: 'Categoría',
    descripcion: 'Elige la categoría que mejor corresponde a lo que ofreces.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-formulario-cerrar"]',
    icono: ClipboardPenLine,
    titulo: 'Cerrar el formulario',
    descripcion: 'Usa este botón, Cancelar o Escape si prefieres salir sin publicar un servicio.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-formulario-titulo"]',
    icono: FileText,
    titulo: 'Título',
    descripcion: 'Escribe un título claro de al menos cinco letras para que los clientes entiendan el servicio.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-formulario-descripcion"]',
    icono: FileText,
    titulo: 'Descripción',
    descripcion: 'Puedes añadir detalles sobre lo que incluyes, los materiales o las zonas donde atiendes. Este campo es opcional.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-formulario-tipo-tarifa"]',
    icono: BadgeDollarSign,
    titulo: 'Cómo cobras',
    descripcion: 'Selecciona si tu tarifa se cobra por hora o como precio fijo.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-formulario-tarifa"]',
    icono: BadgeDollarSign,
    titulo: 'Tarifa',
    descripcion: 'Indica una tarifa mayor que cero en pesos. El campo acepta únicamente números.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-formulario-publicar"]',
    icono: ClipboardPenLine,
    titulo: 'Publicar servicio',
    descripcion: 'Cuando completes los campos obligatorios, este botón se habilita para publicar el servicio. El recorrido no lo pulsa ni guarda información.',
    lado: 'top',
  },
];

const pasosFormularioEdicion = [
  {
    selector: '[data-tour="proveedor-servicios-editar-formulario-inicio"]',
    icono: ClipboardPenLine,
    titulo: 'Editar servicio',
    descripcion: 'Actualiza los datos de este servicio cuando sea necesario. Puedes cerrar o cancelar el panel sin guardar cambios.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-editar-formulario-categoria"]',
    icono: Tags,
    titulo: 'Categoría del servicio',
    descripcion: 'La categoría corresponde al servicio existente y se muestra bloqueada durante la edición.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-editar-formulario-cerrar"]',
    icono: ClipboardPenLine,
    titulo: 'Cerrar la edición',
    descripcion: 'Usa este botón, Cancelar o Escape para salir sin guardar modificaciones.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-editar-formulario-titulo"]',
    icono: FileText,
    titulo: 'Título',
    descripcion: 'Actualiza el título si necesitas describir mejor el servicio. Debe tener al menos cinco letras.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-editar-formulario-descripcion"]',
    icono: FileText,
    titulo: 'Descripción',
    descripcion: 'Modifica los detalles, materiales o zonas de atención cuando corresponda. Este campo es opcional.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-editar-formulario-tipo-tarifa"]',
    icono: BadgeDollarSign,
    titulo: 'Cómo cobras',
    descripcion: 'Puedes actualizar si el cobro será por hora o a precio fijo.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-editar-formulario-tarifa"]',
    icono: BadgeDollarSign,
    titulo: 'Tarifa',
    descripcion: 'Ajusta la tarifa en pesos si es necesario. Debe ser mayor que cero y solo acepta números.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-servicios-editar-formulario-guardar"]',
    icono: ClipboardPenLine,
    titulo: 'Guardar cambios',
    descripcion: 'Cuando los campos obligatorios sean válidos, este botón guarda las modificaciones. El recorrido no lo pulsa.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-servicios-editar-formulario-cancelar"]',
    icono: ClipboardPenLine,
    titulo: 'Cancelar',
    descripcion: 'Cancela para descartar los cambios realizados en este panel.',
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

function convertirPasos(pasos) {
  return pasos
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
}

function iniciarTourFormulario(pasos, selectorFormulario) {
  const pasosDisponibles = convertirPasos(pasos);
  if (pasosDisponibles.length === 0) return false;

  let observador = null;
  const tour = crearTour(pasosDisponibles, {
    iconos: pasosDisponibles.map(({ icono }) => icono),
    allowPageInteraction: true,
    disableActiveInteraction: false,
    onDestroyed: () => observador?.disconnect(),
  });

  observador = new MutationObserver(() => {
    if (!document.querySelector(selectorFormulario)) tour.destroy();
  });
  observador.observe(document.body, { childList: true, subtree: true });
  tour.drive();
  return true;
}

function iniciarTourFormularioNuevoServicio() {
  return iniciarTourFormulario(pasosFormulario, '[data-tour="proveedor-servicios-formulario"]');
}

function iniciarTourFormularioEditarServicio() {
  return iniciarTourFormulario(pasosFormularioEdicion, '[data-tour="proveedor-servicios-editar-formulario"]');
}

export function iniciarTourMisServiciosProveedor() {
  const pasosDisponibles = convertirPasos(pasosPantalla);
  if (pasosDisponibles.length === 0) return false;

  let tour;
  const continuarEnNuevoFormulario = () => {
    if (!tour?.isActive()) return;
    tour.destroy();
    iniciarTourFormularioNuevoServicio();
  };
  const continuarEnFormularioEdicion = () => {
    if (!tour?.isActive()) return;
    tour.destroy();
    iniciarTourFormularioEditarServicio();
  };

  tour = crearTour(pasosDisponibles, {
    iconos: pasosDisponibles.map(({ icono }) => icono),
    allowPageInteraction: true,
    disableActiveInteraction: false,
    onDestroyed: () => {
      window.removeEventListener(EVENTO_NUEVO_SERVICIO_PROVEEDOR_ABIERTO, continuarEnNuevoFormulario);
      window.removeEventListener(EVENTO_EDITAR_SERVICIO_PROVEEDOR_ABIERTO, continuarEnFormularioEdicion);
    },
  });

  window.addEventListener(EVENTO_NUEVO_SERVICIO_PROVEEDOR_ABIERTO, continuarEnNuevoFormulario);
  window.addEventListener(EVENTO_EDITAR_SERVICIO_PROVEEDOR_ABIERTO, continuarEnFormularioEdicion);
  tour.drive();
  return true;
}
