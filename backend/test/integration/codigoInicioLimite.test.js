// Issue #57: límites por USUARIO del código de inicio y el interruptor CODIGO_INICIO_OBLIGATORIO.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, crearServicio, fechaColombia, solicitudEn, iniciarEntorno } = require('./helpers');

test('código de inicio: límites por usuario (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno({ RATE_LIMIT_START_CODE_PER_HOUR: '3', RATE_LIMIT_START_CODE_RENEW_PER_HOUR: '2' });
  t.after(() => entorno.cerrar());

  const proveedor = await registrar('proveedor');
  const cliente = await registrar('cliente');
  const servicioId = await crearServicio(proveedor);

  await t.test('probar códigos en muchas solicitudes se frena con 429 (aunque cada una tenga sus 5 intentos)', async () => {
    const ids = [];
    for (let i = 0; i < 4; i += 1) ids.push(await solicitudEn('aceptada', { cliente, proveedor, servicioId, fecha: fechaColombia(40 + i, '10:00') }));
    for (const id of ids.slice(0, 3)) {
      const r = await api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'en_proceso', codigo: '000000' } });
      assert.equal(r.status, 400);
    }
    const frenado = await api('PUT', `/solicitudes/${ids[3]}/estado`, { token: proveedor.token, body: { estado: 'en_proceso', codigo: '000000' } });
    assert.equal(frenado.status, 429);
    // Los demás cambios de estado no gastan este cupo.
    const pendiente = await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia(50, '10:00') });
    assert.equal((await api('PUT', `/solicitudes/${pendiente}/estado`, { token: proveedor.token, body: { estado: 'aceptada' } })).status, 200);
  });

  await t.test('generar códigos nuevos sin parar se frena con 429', async () => {
    const id = await solicitudEn('aceptada', { cliente, proveedor, servicioId, fecha: fechaColombia(51, '10:00') });
    for (let i = 0; i < 2; i += 1) assert.equal((await api('POST', `/solicitudes/${id}/codigo-inicio`, { token: cliente.token })).status, 200);
    assert.equal((await api('POST', `/solicitudes/${id}/codigo-inicio`, { token: cliente.token })).status, 429);
    // Ver el código no tiene ese límite.
    assert.equal((await api('GET', `/solicitudes/${id}/codigo-inicio`, { token: cliente.token })).status, 200);
  });
});

test('código de inicio desactivado con CODIGO_INICIO_OBLIGATORIO=false (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno({ CODIGO_INICIO_OBLIGATORIO: 'false' });
  t.after(() => entorno.cerrar());

  const proveedor = await registrar('proveedor');
  const cliente = await registrar('cliente');
  const servicioId = await crearServicio(proveedor);
  const id = await solicitudEn('aceptada', { cliente, proveedor, servicioId, fecha: fechaColombia(60, '10:00') });

  const codigo = await api('GET', `/solicitudes/${id}/codigo-inicio`, { token: cliente.token });
  assert.equal(codigo.status, 200);
  assert.equal(codigo.body.obligatorio, false, 'la web puede ocultar la tarjeta del código');
  assert.equal((await api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'en_proceso' } })).status, 200);
});
