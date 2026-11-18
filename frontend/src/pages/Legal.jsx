import { Link } from 'react-router-dom';
import './Legal.css';

// Páginas legales y de contacto (issue #75).
// Mismo correo que usa el backend para enviar las notificaciones (EMAIL_FROM por defecto).
const CORREO_CONTACTO = 'notificaciones@urbify.app';

function PaginaLegal({ titulo, children }) {
  return (
    <article className="lg" aria-labelledby="lg-titulo">
      <h1 id="lg-titulo">{titulo}</h1>
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
        Las solicitudes pasan por estados (pendiente, aceptada, en proceso, completada o cancelada). Puedes cancelar una
        solicitud mientras esté pendiente o aceptada, es decir, antes de que empiece el servicio. En esos mismos estados,
        cliente y proveedor pueden proponer una nueva fecha (reprogramación), que la otra parte acepta o rechaza. Procura
        avisar con tiempo para no afectar el trabajo de la otra persona.
      </p>
      <h2>4. Calificaciones</h2>
      <p>
        Las calificaciones deben ser honestas y respetuosas, y basarse en un servicio realmente prestado. Podemos retirar
        las que incluyan insultos, datos personales de terceros o contenido ajeno al servicio.
      </p>
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
        Tu teléfono y tu dirección solo se comparten con la otra parte de una solicitud en curso. Para funcionar usamos
        servicios de terceros, como el envío de correos (códigos de verificación y avisos) y los mapas para ubicar
        direcciones; solo reciben los datos necesarios para esa tarea. No vendemos tus datos.
      </p>
      <h2>4. Tus derechos</h2>
      <p>
        Tratamos tus datos personales conforme a la Ley 1581 de 2012 (régimen general de protección de datos personales
        en Colombia) y sus decretos reglamentarios. Como titular de los datos tienes derecho a:
      </p>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos.</li>
        <li>Pedir prueba de la autorización que nos diste para tratarlos.</li>
        <li>Saber cómo los hemos usado.</li>
        <li>Revocar la autorización y pedir que suprimamos tus datos, salvo que debamos conservarlos por una obligación legal.</li>
        <li>
          Presentar una queja ante la Superintendencia de Industria y Comercio si consideras que no respetamos tus
          derechos.
        </li>
      </ul>
      <p>
        Para ejercer estos derechos escríbenos a <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a> desde el
        correo de tu cuenta, indicando tu nombre y qué necesitas. Responderemos las consultas en un máximo de 10 días
        hábiles y los reclamos en un máximo de 15 días hábiles.
      </p>
    </PaginaLegal>
  );
}

export function Contacto() {
  return (
    <PaginaLegal titulo="Contacto">
      <p>¿Tienes una duda, un problema con una solicitud o una sugerencia? Escríbenos.</p>
      <p>
        Correo de contacto: <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>
      </p>
      <h2>Para ayudarte más rápido</h2>
      <p>Explica tu problema con el mayor detalle posible e incluye:</p>
      <ul>
        <li>Tu nombre y el correo de tu cuenta.</li>
        <li>Qué pasó y en qué momento (fecha y hora aproximadas).</li>
        <li>El servicio o la solicitud involucrada, si la hay.</li>
        <li>Capturas de pantalla, si puedes.</li>
      </ul>
      <h2>Horario de atención</h2>
      <p>
        Atendemos de lunes a viernes, de 8:00 a. m. a 6:00 p. m. (hora de Colombia). Respondemos en un máximo de 2 días
        hábiles.
      </p>
    </PaginaLegal>
  );
}
