// Plantilla de los correos de Urbify: misma imagen en todos (encabezado, tarjeta, código destacado, aviso de seguridad
// y pie) y siempre con versión en texto plano (la usan los lectores sin HTML y ayuda a que no lo marquen como spam).
// Todo lo que viene del usuario o de la base se escapa; el HTML usa tablas y estilos en línea porque es lo único que
// soportan todos los clientes de correo.
const { escapeHtml } = require('./html');

const AZUL = '#0b2a6f';
const CIAN = '#14b8c9';

// opciones:
//   preheader  texto corto que algunos clientes muestran junto al asunto
//   titulo     encabezado grande de la tarjeta
//   parrafos   array de textos (se escapan)
//   codigo     opcional: se muestra grande dentro de una caja
//   vence      opcional: texto bajo el código ("Vence en 10 minutos y solo sirve una vez.")
//   aviso      opcional: recuadro de seguridad
//   pie        opcional: texto final antes de la firma
function plantillaCorreo({ preheader = '', titulo, parrafos = [], codigo, vence, aviso, pie }) {
  const ps = parrafos.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155">${escapeHtml(p)}</p>`).join('');

  const bloqueCodigo = codigo ? `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:22px 0 8px">
          <tr><td align="center" style="background:#eef4ff;border:1px solid #c9dafc;border-radius:12px;padding:22px 12px">
            <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#5b6b8c;margin-bottom:8px">Tu código</div>
            <div style="font-family:Consolas,'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:${AZUL};padding-left:10px">${escapeHtml(codigo)}</div>
          </td></tr>
        </table>
        ${vence ? `<p style="margin:0 0 18px;text-align:center;font-size:13px;color:#64748b">${escapeHtml(vence)}</p>` : ''}` : '';

  const bloqueAviso = aviso ? `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 4px">
          <tr><td style="background:#fff7e6;border-left:4px solid #f59e0b;border-radius:6px;padding:12px 14px;font-size:13px;line-height:1.55;color:#7a4b00">
            <strong>Por tu seguridad:</strong> ${escapeHtml(aviso)}
          </td></tr>
        </table>` : '';

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f1f5fb">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5fb;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px">
        <tr><td style="background:${AZUL};border-radius:14px 14px 0 0;padding:22px 28px">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;letter-spacing:3px;color:#ffffff">URBIFY</span>
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${CIAN};margin-left:6px"></span>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:0 0 14px 14px;padding:28px;font-family:Arial,Helvetica,sans-serif">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${AZUL}">${escapeHtml(titulo)}</h1>
          ${ps}${bloqueCodigo}${bloqueAviso}
          ${pie ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#334155">${escapeHtml(pie)}</p>` : ''}
        </td></tr>
        <tr><td align="center" style="padding:16px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#8190a8">
          Mensaje automático de Urbify · Servicios urbanos. Por favor no respondas a este correo.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    titulo,
    '',
    ...parrafos,
    ...(codigo ? ['', `Tu código: ${codigo}`, ...(vence ? [vence] : [])] : []),
    ...(aviso ? ['', `Por tu seguridad: ${aviso}`] : []),
    ...(pie ? ['', pie] : []),
    '',
    '— Urbify · Servicios urbanos (mensaje automático, no respondas a este correo)',
  ].join('\n');

  return { html, text };
}

module.exports = { plantillaCorreo };
