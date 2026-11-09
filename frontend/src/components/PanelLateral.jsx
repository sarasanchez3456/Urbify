import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './PanelLateral.css';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Panel que se desliza desde la derecha sobre la pantalla actual (sin cambiar de página).
// Cierra con Escape o al hacer clic fuera, mantiene el foco dentro mientras está abierto y lo devuelve
// al elemento que lo abrió cuando se cierra.
export default function PanelLateral({ onCerrar, etiqueta, ancho = 480, children }) {
  const panelRef = useRef(null);
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;

  useEffect(() => {
    const anterior = document.activeElement;
    const panel = panelRef.current;
    // Pequeña espera para que el panel ya esté en el DOM antes de pasarle el foco.
    const t = setTimeout(() => {
      const primero = panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE);
      (primero || panel)?.focus();
    }, 30);

    const alTeclear = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCerrarRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const primero = items[0];
      const ultimo = items[items.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', alTeclear);
      if (anterior && typeof anterior.focus === 'function' && document.contains(anterior)) anterior.focus();
    };
  }, []);

  return createPortal(
    <div className="pl-raiz">
      <div className="pl-velo" onClick={onCerrar} aria-hidden="true" />
      <aside
        ref={panelRef}
        className="pl-panel"
        style={{ width: `min(${ancho}px, 100%)` }}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        tabIndex={-1}
      >
        {children}
      </aside>
    </div>,
    document.body
  );
}
