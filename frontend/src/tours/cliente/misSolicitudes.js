import { crearTour } from '../crearTour';

const pasos = [
  {
    selector: '[data-tour="mis-solicitudes-inicio"]',
    titulo: 'Mis Solicitudes',
    descripcion: 'Desde aquí puedes consultar los servicios que has solicitado y revisar el estado de cada uno.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="mis-solicitudes-listado"]',
    titulo: 'Tus solicitudes',
    descripcion: 'Aquí encontrarás tus solicitudes y podrás ver rápidamente en qué estado se encuentra cada servicio.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="mis-solicitudes-filtros"]',
    titulo: 'Filtra tus solicitudes',
    descripcion: 'Puedes organizar la lista por servicios en curso, completados o cancelados.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="mis-solicitudes-estado"]',
    titulo: 'Estado de la solicitud',
    descripcion: 'El estado te indica si el servicio está pendiente, aceptado, en proceso, completado o cancelado.',
    lado: 'left',
  },
  {
    selector: '[data-tour="mis-solicitudes-detalle"]',
    titulo: 'Detalle de la solicitud',
    descripcion: 'Selecciona una solicitud para consultar el profesional, la fecha, la dirección y los detalles del servicio.',
    lado: 'left',
  },
  {
    selector: '[data-tour="mis-solicitudes-chat"]',
    titulo: 'Comunícate con el profesional',
    descripcion: 'Usa el chat para coordinar los detalles necesarios del servicio.',
    lado: 'top',
  },
  {
    selector: '[data-tour="mis-solicitudes-reprogramar"]',
    titulo: 'Cambiar la fecha',
    descripcion: 'Cuando esta solicitud lo permita, puedes pedir un cambio para la fecha de la cita.',
    lado: 'top',
  },
  {
    selector: '[data-tour="mis-solicitudes-cancelar"]',
    titulo: 'Cancelar solicitud',
    descripcion: 'Esta opción permite cancelar la solicitud cuando su estado todavía lo permite.',
    lado: 'top',
  },
  {
    selector: '[data-tour="mis-solicitudes-reportar"]',
    titulo: 'Reportar un problema',
    descripcion: 'Si surge un problema con el servicio, puedes reportarlo para que la administración lo revise.',
    lado: 'top',
  },
  {
    selector: '[data-tour="mis-solicitudes-calificar"]',
    titulo: 'Califica el servicio',
    descripcion: 'Cuando el servicio haya terminado, podrás compartir tu experiencia y calificar al profesional.',
    lado: 'left',
  },
];

export function iniciarTourMisSolicitudes() {
  const pasosTour = pasos.map(({ selector, titulo, descripcion, lado }) => ({
    element: selector,
    skipMissingElement: true,
    popover: {
      title: titulo,
      description: descripcion,
      side: lado,
      align: 'center',
    },
  }));

  crearTour(pasosTour).drive();
}
