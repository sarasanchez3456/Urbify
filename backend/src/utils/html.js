// Escapa texto del usuario antes de ponerlo en el HTML de un correo.
function escapeHtml(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { escapeHtml };
