import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './recorrido.css';

const configuracionComun = {
  animate: true,
  allowClose: true,
  allowKeyboardControl: true,
  overlayOpacity: 0.55,
  stagePadding: 6,
  stageRadius: 10,
  showButtons: ['previous', 'next', 'close'],
  showProgress: true,
  progressText: '{{current}} de {{total}}',
  nextBtnText: 'Siguiente',
  prevBtnText: 'Anterior',
  doneBtnText: 'Finalizar',
  closeBtnLabel: 'Cerrar recorrido',
  popoverClass: 'urbify-tour',
};

// Cada paso puede traer un icono de lucide-react (componente), que se pinta arriba del título.
// El icono y los puntitos de progreso se montan al abrir cada globo, sin tocar la lógica de los pasos.
export function crearTour(pasos, { iconos = [], onDestroyed, ...callbacks } = {}) {
  let raiz = null;

  const limpiarIcono = () => {
    const anterior = raiz;
    raiz = null;
    if (anterior) setTimeout(() => anterior.unmount(), 0);
  };

  return driver({
    ...configuracionComun,
    ...callbacks,
    steps: pasos,
    onPopoverRender: (popover, { state }) => {
      const indice = state.activeIndex ?? 0;
      const total = pasos.length;

      limpiarIcono();
      const Icono = iconos[indice];
      if (Icono) {
        const contenedor = document.createElement('div');
        contenedor.className = 'urbify-tour-icono';
        contenedor.setAttribute('aria-hidden', 'true');
        popover.wrapper.insertBefore(contenedor, popover.title);
        raiz = createRoot(contenedor);
        raiz.render(createElement(Icono, { size: 18, strokeWidth: 2 }));
      }

      const puntos = document.createElement('span');
      puntos.className = 'urbify-tour-puntos';
      for (let i = 0; i < total; i += 1) {
        const punto = document.createElement('i');
        if (i === indice) punto.className = 'activo';
        puntos.appendChild(punto);
      }
      popover.progress.textContent = '';
      popover.progress.setAttribute('aria-label', `Paso ${indice + 1} de ${total}`);
      popover.progress.appendChild(puntos);

      popover.wrapper.classList.toggle('urbify-tour-ultimo', indice === total - 1);
    },
    onDestroyed: (...argumentos) => {
      limpiarIcono();
      onDestroyed?.(...argumentos);
    },
  });
}
