// Avisos en vivo (SSE): en un entorno sin servidor (AVISOS_EN_VIVO=false) el canal responde de inmediato para que la web
// use su consulta cada 30 s; por defecto sigue funcionando como siempre.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, iniciarEntorno, URL_BASE } = require('./helpers');

test('avisos en vivo apagados (entorno sin servidor)', async (t) => {
  const entorno = await iniciarEntorno({ AVISOS_EN_VIVO: 'false' });
  t.after(() => entorno.cerrar());
  const usuario = await registrar('cliente');

  await t.test('el canal en vivo responde 503 enseguida (no deja una conexión abierta)', async () => {
    const r = await api('GET', '/notificaciones/stream', { token: usuario.token });
    assert.equal(r.status, 503);
  });

  await t.test('la consulta normal de notificaciones sigue funcionando', async () => {
    const r = await api('GET', '/notificaciones', { token: usuario.token });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body));
  });

  await t.test('sin sesión sigue dando 401 (la autenticación va primero)', async () => {
    assert.equal((await api('GET', '/notificaciones/stream')).status, 401);
  });
});

test('avisos en vivo encendidos (por defecto)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const usuario = await registrar('cliente');
  const control = new AbortController();
  const r = await fetch(`${URL_BASE}/notificaciones/stream`, { headers: { Authorization: `Bearer ${usuario.token}` }, signal: control.signal });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/event-stream/);
  control.abort();
});
