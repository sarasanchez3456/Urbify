import { crearTour } from '../crearTour';

const pasos = [
  {
    selector: '[data-tour="perfil-cliente-inicio"]',
    titulo: 'Mi Perfil',
    descripcion: 'Desde aquí puedes revisar y actualizar la información de tu cuenta en Urbify.',
    lado: 'bottom',
  },
  {
    selector: '[data-tour="perfil-cliente-informacion"]',
    titulo: 'Información del perfil',
    descripcion: 'Aquí ves tu nombre, tu tipo de cuenta y qué tan completo está tu perfil.',
    lado: 'right',
  },
  {
    selector: '[data-tour="perfil-cliente-datos"]',
    titulo: 'Datos personales',
    descripcion: 'Aquí puedes mantener actualizados tus datos personales.',
    lado: 'right',
  },
  {
    selector: '[data-tour="perfil-cliente-contacto"]',
    titulo: 'Contacto y dirección',
    descripcion: 'Actualiza tu teléfono y dirección para facilitar la coordinación de los servicios.',
    lado: 'right',
  },
  {
    selector: '[data-tour="perfil-cliente-guardar"]',
    titulo: 'Guardar cambios',
    descripcion: 'Cuando modifiques tus datos, utiliza este botón para guardar los cambios.',
    lado: 'top',
  },
  {
    selector: '[data-tour="perfil-cliente-ser-proveedor"]',
    titulo: '¿Quieres ofrecer tus servicios?',
    descripcion: 'Si también quieres trabajar ofreciendo servicios en Urbify, desde aquí puedes habilitar tu perfil como proveedor.',
    lado: 'left',
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

export function iniciarTourPerfilCliente() {
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

  crearTour(pasosTour).drive();
}
