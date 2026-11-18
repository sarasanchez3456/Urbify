import { Link } from 'react-router-dom';
import './Legal.css';

// Páginas legales y de contacto (issue #75). El texto es un BORRADOR de relleno: el equipo debe aprobar la
// versión definitiva (en especial la de privacidad, que suele apoyarse en la Ley 1581 de 2012).
function PaginaLegal({ titulo, children }) {
  return (
    <article className="lg" aria-labelledby="lg-titulo">
      <h1 id="lg-titulo">{titulo}</h1>
      <p className="lg-borrador" role="note">
        Borrador: este texto es provisional hasta que el equipo apruebe la versión definitiva.
      </p>
      {children}
      <p className="lg-volver">
        <Link to="/">Volver al inicio</Link>
      </p>
    </article>
  );
}

export function Terminos() {
  return (
    <PaginaLegal titulo="Términos y condiciones">
      <h2>1. Qué es Urbify</h2>
      <p>
        Urbify conecta a personas que necesitan un servicio para el hogar (clientes) con profesionales que lo ofrecen
        (proveedores). Urbify facilita el encuentro; el servicio se acuerda entre las dos partes.
      </p>
      <h2>2. Cuentas</h2>
      <p>
        Cada persona tiene una sola cuenta, que puede usarse en modo cliente o en modo proveedor. Debes dar datos
        verdaderos y mantener segura tu contraseña. Podemos suspender cuentas que incumplan estas reglas.
      </p>
      <h2>3. Solicitudes y cancelaciones</h2>
      <p>
        Las solicitudes pasan por estados (pendiente, aceptada, en proceso, completada o cancelada). [Pendiente: reglas
        de cancelación y reprogramación.]
      </p>
      <h2>4. Calificaciones</h2>
      <p>Las calificaciones deben ser honestas y respetuosas. [Pendiente: reglas de moderación.]</p>
      <h2>5. Cambios en estos términos</h2>
      <p>Podemos actualizar estos términos y avisaremos dentro de la plataforma.</p>
    </PaginaLegal>
  );
}

export function Privacidad() {
  return (
    <PaginaLegal titulo="Política de privacidad">
      <h2>1. Qué datos guardamos</h2>
      <p>Nombre, correo, teléfono, dirección y ubicación aproximada, además de tus solicitudes, mensajes y calificaciones.</p>
      <h2>2. Para qué los usamos</h2>
      <p>Para crear tu cuenta, mostrarte profesionales cercanos, gestionar tus solicitudes y enviarte avisos del servicio.</p>
      <h2>3. Quién los ve</h2>
      <p>
        Tu teléfono y tu dirección solo se comparten con la otra parte de una solicitud en curso. [Pendiente: detalle de
        proveedores de correo y mapas.]
      </p>
      <h2>4. Tus derechos</h2>
      <p>
        Puedes pedir que corrijamos o borremos tus datos. [Pendiente: canal y plazos, conforme a la Ley 1581 de 2012;
        confirmar con el profesor.]
      </p>
    </PaginaLegal>
  );
}

export function Contacto() {
  return (
    <PaginaLegal titulo="Contacto">
      <p>¿Tienes una duda, un problema con una solicitud o una sugerencia? Escríbenos.</p>
      <p>
        Correo de soporte: <strong>[por definir por el equipo]</strong>
      </p>
      <p>[Pendiente: horario de atención y si habrá formulario de contacto.]</p>
    </PaginaLegal>
  );
}
