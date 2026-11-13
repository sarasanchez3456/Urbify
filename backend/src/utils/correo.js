// Envío de correos. Un solo lugar para elegir el proveedor, según lo que esté configurado:
//   1) Gmail (GMAIL_USER + GMAIL_APP_PASSWORD, "contraseña de aplicación"): gratis, llega a cualquier dirección.
//   2) Resend (RESEND_API_KEY): requiere un dominio verificado para enviar a cualquier dirección.
//   3) Ninguno: en desarrollo y pruebas el mensaje se imprime en la consola (solo si se pasa `textoDev`);
//      en producción se lanza un error. Nunca se imprime un código en producción.
const nodemailer = require('nodemailer');
const resend = require('../config/resend');
const { emailFrom, NODE_ENV } = require('../config/env');

let transporteGmail = null;

// Google muestra la contraseña de aplicación en grupos de 4 ("abcd efgh ijkl mnop"): se aceptan con o sin espacios.
const credencialesGmail = () => {
  const usuario = (process.env.GMAIL_USER || '').trim();
  const clave = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  return usuario && clave ? { usuario, clave } : null;
};

function proveedorActivo() {
  if (credencialesGmail()) return 'gmail';
  if ((process.env.RESEND_API_KEY || '').trim()) return 'resend';
  return null;
}

// `text`: versión en texto plano (opcional). `textoDev`: texto corto para la consola cuando no hay proveedor (solo desarrollo/pruebas).
async function enviarCorreo({ to, subject, html, text, textoDev }) {
  const proveedor = proveedorActivo();

  if (proveedor === 'gmail') {
    const { usuario, clave } = credencialesGmail();
    if (!transporteGmail) {
      // Puerto 587 con STARTTLS obligatorio (requireTLS) y el certificado del servidor SIEMPRE verificado.
      transporteGmail = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true, auth: { user: usuario, pass: clave },
      });
    }
    await transporteGmail.sendMail({ from: `"Urbify" <${usuario}>`, to, subject, html, text });
    return;
  }

  if (proveedor === 'resend') {
    const r = await resend.emails.send({ from: emailFrom || 'Urbify <notificaciones@urbify.app>', to, subject, html, text });
    if (r?.error) throw new Error(r.error.message || 'Resend rechazó el correo');
    return;
  }

  if (textoDev && NODE_ENV !== 'production' && NODE_ENV !== 'staging') {
    console.log(`[correo-dev] Para ${to}: ${textoDev}`);
    return;
  }
  throw new Error('No hay un proveedor de correo configurado (GMAIL_USER/GMAIL_APP_PASSWORD o RESEND_API_KEY)');
}

module.exports = { enviarCorreo, proveedorActivo };
