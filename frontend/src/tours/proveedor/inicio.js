import { CalendarDays, ClipboardList, LayoutDashboard, Wallet, Wrench } from 'lucide-react';
import { crearTour } from '../crearTour';

const pasos = [
  {
    selector: '[data-tour="proveedor-bienvenida"]',
    icono: LayoutDashboard,
    titulo: 'Inicio del proveedor',
    descripcion: 'Desde aquí puedes revisar lo más importante de tu actividad y organizar tu trabajo.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="proveedor-por-responder"]',
    icono: ClipboardList,
    titulo: 'Solicitudes por responder',
    descripcion: 'Revisa las solicitudes nuevas y los cambios de fecha que esperan tu respuesta.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="proveedor-proximas-visitas"]',
    icono: CalendarDays,
    titulo: 'Próximas visitas',
    descripcion: 'Aquí ves las visitas programadas y puedes abrir Mis Solicitudes para consultar sus detalles.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="proveedor-configurar-agenda"]',
    icono: CalendarDays,
    titulo: 'Configura tu agenda',
    descripcion: 'Si aparece este aviso, define tus horas de atención para controlar los horarios que ofreces.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-resumen"]',
    icono: Wallet,
    titulo: 'Tu resumen',
    descripcion: 'Consulta cuántas solicitudes tienes por aceptar, en curso y completadas, junto con el estimado mostrado.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-accesos"]',
    icono: Wrench,
    titulo: 'Accesos rápidos',
    descripcion: 'Usa estos accesos para administrar Mis servicios, Mi agenda, la Billetera y Mi perfil.',
    lado: 'left',
  },
];

export function iniciarTourInicioProveedor() {
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

  crearTour(pasosDisponibles, {
    iconos: pasosDisponibles.map(({ icono }) => icono),
  }).drive();
  return true;
}
