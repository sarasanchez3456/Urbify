import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const configuracionComun = {
  animate: true,
  allowClose: true,
  allowKeyboardControl: true,
  overlayOpacity: 0.55,
  showButtons: ['previous', 'next', 'close'],
  showProgress: true,
  progressText: '{{current}} de {{total}}',
  nextBtnText: 'Siguiente',
  prevBtnText: 'Anterior',
  doneBtnText: 'Finalizar',
  closeBtnLabel: 'Cerrar recorrido',
  popoverClass: 'urbify-tour',
};

export function crearTour(pasos, callbacks = {}) {
  return driver({
    ...configuracionComun,
    ...callbacks,
    steps: pasos,
  });
}
