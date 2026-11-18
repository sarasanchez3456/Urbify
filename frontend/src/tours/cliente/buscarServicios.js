import { crearTour } from '../crearTour';

const pasos = [
  {
    selector: '[data-tour="buscar-servicios-inicio"]',
    titulo: 'Buscar Servicios',
    descripcion: 'Vamos a ver cómo encontrar un profesional: busca lo que necesitas, indica dónde y revisa las opciones cercanas.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="buscar-servicios-buscador"]',
    titulo: 'Buscador',
    descripcion: 'Escribe el servicio o problema que necesitas, por ejemplo electricista, plomero o fuga de agua. Los resultados se actualizarán según tu búsqueda.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="buscar-servicios-categorias"]',
    titulo: 'Categorías',
    descripcion: 'También puedes elegir una categoría para reducir los resultados. Este paso es opcional.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="buscar-servicios-ubicacion"]',
    titulo: 'Ubicación',
    descripcion: 'Indica dónde necesitas el servicio. Puedes escribir una dirección o usar tu ubicación actual.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="buscar-servicios-radio"]',
    titulo: 'Radio de búsqueda',
    descripcion: 'Después de indicar tu ubicación, define qué tan lejos buscar profesionales.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="buscar-servicios-mapa"]',
    titulo: 'Mapa',
    descripcion: 'En el mapa puedes ver tu ubicación y los profesionales disponibles dentro del área de búsqueda.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="buscar-servicios-resultados"]',
    titulo: 'Resultados',
    descripcion: 'Aquí aparecen los servicios y profesionales que coinciden con tu búsqueda.',
    lado: 'top',
  },
  {
    selector: '[data-tour="buscar-servicios-abrir-servicio"]',
    titulo: 'Abrir un servicio',
    descripcion: 'Selecciona un resultado para ver sus detalles y continuar con tu solicitud.',
    lado: 'right',
  },
];

export function iniciarTourBuscarServicios() {
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
