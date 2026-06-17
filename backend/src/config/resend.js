const { Resend } = require('resend');
require('dotenv').config();

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY no configurado — los emails no se enviarán');
}

const resend = new Resend(process.env.RESEND_API_KEY || 're_disabled');

module.exports = resend;
