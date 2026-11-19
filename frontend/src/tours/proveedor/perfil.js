import { ClipboardList, Lock, Mail, MapPin, Pencil, User } from 'lucide-react';
import { crearTour } from '../crearTour';

const pasos = [
  {
    selector: '[data-tour="proveedor-perfil-inicio"]',
    icono: User,
    titulo: 'Mi Perfil',
    descripcion: 'Desde aquí revisas y actualizas la información de tu cuenta de proveedor.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="proveedor-perfil-informacion"]',
    icono: User,
    titulo: 'Información del perfil',
    descripcion: 'Aquí ves tu nombre, el tipo de cuenta y el nivel de completitud de los datos del perfil.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-perfil-avatar"]',
    icono: User,
    titulo: 'Identificador del perfil',
    descripcion: 'Esta pantalla muestra una inicial como identificador de tu perfil. No incluye una función para subir foto.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-perfil-datos"]',
    icono: Pencil,
    titulo: 'Datos personales',
    descripcion: 'Puedes actualizar directamente tu nombre y apellido. Al modificar datos aparece una barra para guardar o descartar los cambios.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-perfil-contacto"]',
    icono: User,
    titulo: 'Contacto',
    descripcion: 'Mantén actualizado tu teléfono para facilitar la coordinación de tus servicios.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-perfil-ubicacion"]',
    icono: MapPin,
    titulo: 'Dirección',
    descripcion: 'Como proveedor, indica calle, barrio y ciudad, y elige una sugerencia para confirmar tu ubicación en el mapa.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-perfil-cuenta"]',
    icono: Mail,
    titulo: 'Cuenta',
    descripcion: 'Aquí consultas el correo asociado a la cuenta. Este correo no se puede cambiar desde esta pantalla.',
    lado: 'right',
  },
  {
    selector: '[data-tour="proveedor-perfil-resumen"]',
    icono: ClipboardList,
    titulo: 'Actividad como proveedor',
    descripcion: 'El resumen muestra desde cuándo eres miembro y, cuando están disponibles, tus solicitudes recibidas y servicios completados.',
    lado: 'left',
  },
  {
    selector: '[data-tour="proveedor-perfil-seguridad"]',
    icono: Lock,
    titulo: 'Seguridad',
    descripcion: 'Desde esta sección puedes iniciar los procesos de cambio de contraseña o eliminación de cuenta. El recorrido no abre ninguno.',
    lado: 'left',
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

export function iniciarTourPerfilProveedor() {
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
