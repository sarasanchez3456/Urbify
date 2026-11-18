import { CircleHelp } from 'lucide-react';

export default function BotonAyuda({ abierto, onClick }) {
  return (
    <button
      type="button"
      className="ayuda-boton"
      onClick={onClick}
      aria-label={abierto ? 'Cerrar centro de ayuda' : 'Abrir centro de ayuda'}
      aria-haspopup="dialog"
      aria-expanded={abierto}
    >
      <CircleHelp size={20} aria-hidden="true" />
      <span className="hidden sm:inline">Ayuda</span>
    </button>
  );
}
