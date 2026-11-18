const { Resend } = require('resend');
require('dotenv').config();

// Solo se avisa si NO hay ningún proveedor de correo (Gmail o Resend): con Gmail configurado el aviso era engañoso.
const hayGmail = Boolean((process.env.GMAIL_USER || '').trim() && (process.env.GMAIL_APP_PASSWORD || '').trim());
if (!process.env.RESEND_API_KEY && !hayGmail) {
  console.warn('Sin proveedor de correo (GMAIL_USER/GMAIL_APP_PASSWORD o RESEND_API_KEY) — los emails no se enviarán');
}

const resend = new Resend(process.env.RESEND_API_KEY || 're_disabled');

module.exports = resend;
