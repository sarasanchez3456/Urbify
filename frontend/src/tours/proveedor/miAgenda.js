import { CalendarDays, Clock3, Eye, Plus, Save, ToggleRight, Trash2 } from 'lucide-react';
import { crearTour } from '../crearTour';

const pasos = [
  {
    selector: '[data-tour="proveedor-agenda-inicio"]',
    icono: CalendarDays,
    titulo: 'Mi agenda',
    descripcion: 'Aquí defines las horas en las que atiendes y revisas las próximas visitas.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="proveedor-agenda-horario-semanal"]',
    icono: CalendarDays,
    titulo: 'Horario semanal',
    descripcion: 'Los clientes solo pueden solicitar citas dentro de este horario. Cada cita ocupa una hora disponible.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="proveedor-agenda-sin-configurar"]',
    icono: Clock3,
    titulo: 'Horario predeterminado',
    descripcion: 'Este aviso aparece mientras no hayas guardado una agenda propia. Configúrala para controlar tus horas de atención.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="proveedor-agenda-dias"]',
    icono: CalendarDays,
    titulo: 'Días de atención',
    descripcion: 'Aquí están los siete días de la semana y las franjas configuradas para cada uno.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-agenda-activar-dia"]',
    icono: ToggleRight,
    titulo: 'Activar un día',
    descripcion: 'Usa este interruptor para indicar si atiendes ese día. Al activarlo se crea una franja inicial que puedes ajustar.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-agenda-franja"]',
    icono: Clock3,
    titulo: 'Franjas horarias',
    descripcion: 'Una franja define el periodo en que puedes recibir citas durante ese día.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-agenda-hora-inicio"]',
    icono: Clock3,
    titulo: 'Hora de inicio',
    descripcion: 'Selecciona desde qué hora atenderás en esta franja.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-agenda-hora-fin"]',
    icono: Clock3,
    titulo: 'Hora de finalización',
    descripcion: 'Selecciona hasta qué hora atenderás. Cada franja debe durar al menos una hora y no puede cruzarse con otra.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-agenda-agregar-franja"]',
    icono: Plus,
    titulo: 'Agregar otra franja',
    descripcion: 'Si atiendes en horarios separados, agrega otra franja para ese día. Puedes tener hasta cuatro.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-agenda-quitar-franja"]',
    icono: Trash2,
    titulo: 'Quitar una franja',
    descripcion: 'Usa este control para eliminar una franja que ya no ofreces.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-agenda-guardar"]',
    icono: Save,
    titulo: 'Guardar horario',
    descripcion: 'Después de ajustar los días y franjas, este botón se habilita para guardar una configuración válida. El recorrido no lo pulsa.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-agenda-visitas"]',
    icono: CalendarDays,
    titulo: 'Próximas visitas',
    descripcion: 'Aquí puedes consultar las visitas futuras asociadas a tus solicitudes activas.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-agenda-visitas-programadas"]',
    icono: Clock3,
    titulo: 'Visitas programadas',
    descripcion: 'Cuando existan visitas, se agrupan por día y muestran hora, servicio, cliente, dirección disponible y estado.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-agenda-vista-cliente"]',
    icono: Eye,
    titulo: 'Vista para clientes',
    descripcion: 'Esta vista previa muestra las horas ofrecidas durante los próximos 14 días; las tachadas ya tienen cita.',
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

export function iniciarTourMiAgendaProveedor() {
  const pasosDisponibles = pasos
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
