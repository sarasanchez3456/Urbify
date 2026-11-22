import { BarChart3, BriefcaseBusiness, CalendarDays, CircleDollarSign, FileText } from 'lucide-react';
import { crearTour } from '../crearTour';

const pasos = [
  {
    selector: '[data-tour="proveedor-ingresos-inicio"]',
    icono: CircleDollarSign,
    titulo: 'Billetera',
    descripcion: 'Aquí consultas lo que has ganado con los servicios que ya marcaste como completados.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="proveedor-ingresos-total"]',
    icono: CircleDollarSign,
    titulo: 'Ingresos totales',
    descripcion: 'Este total suma las tarifas acordadas de tus trabajos completados.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="proveedor-ingresos-meses"]',
    icono: BarChart3,
    titulo: 'Últimos 6 meses',
    descripcion: 'Este resumen compara los ingresos registrados por mes, incluido el mes actual.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-ingresos-barras"]',
    icono: BarChart3,
    titulo: 'Ingresos por mes',
    descripcion: 'Cada barra representa la suma de tarifas acordadas de los trabajos completados durante ese mes.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-ingresos-historial"]',
    icono: BriefcaseBusiness,
    titulo: 'Historial',
    descripcion: 'Aquí se registran tus trabajos completados, ordenados del más reciente al más antiguo.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-ingresos-vacio"]',
    icono: FileText,
    titulo: 'Sin trabajos completados',
    descripcion: 'Cuando completes un trabajo, aparecerá en este historial y se incluirá en los ingresos mostrados.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-ingresos-trabajo"]',
    icono: BriefcaseBusiness,
    titulo: 'Trabajo completado',
    descripcion: 'Cada fila es un ejemplo de un trabajo incluido en el historial.',
    lado: 'top',
  },
  {
    selector: '[data-tour="proveedor-ingresos-informacion"]',
    icono: CalendarDays,
    titulo: 'Servicio, cliente y fecha',
    descripcion: 'La fila muestra el servicio, el cliente y la fecha registrada para ese trabajo.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-ingresos-monto"]',
    icono: CircleDollarSign,
    titulo: 'Tarifa acordada',
    descripcion: 'Este valor corresponde a la tarifa registrada para el trabajo y muestra su modalidad cuando está disponible.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-ingresos-nota"]',
    icono: FileText,
    titulo: 'Cómo se calcula',
    descripcion: 'Las tarifas por hora cuentan como una hora en este resumen; el ingreso real puede ser mayor si trabajaste más tiempo.',
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

export function iniciarTourIngresosProveedor() {
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
  }).drive();
  return true;
}
