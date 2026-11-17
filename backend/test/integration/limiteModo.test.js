// Límites por USUARIO del doble modo: cambiar de modo o activar el modo proveedor en bucle se frena con 429.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, iniciarEntorno } = require('./helpers');

test('límites de peticiones del doble modo (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno({ RATE_LIMIT_MODE_SWITCH_PER_HOUR: '3', RATE_LIMIT_BECOME_PROVIDER_PER_HOUR: '2' });
  t.after(() => entorno.cerrar());

  await t.test('cambiar de modo: al cuarto cambio en una hora responde 429, y el límite es por usuario', async () => {
    const proveedor = await registrar('proveedor');
    const otro = await registrar('proveedor');
    let token = proveedor.token;
    const modos = ['cliente', 'proveedor', 'cliente'];
    for (const modo of modos) {
      const r = await api('POST', '/auth/cambiar-modo', { token, body: { modo } });
      assert.equal(r.status, 200);
      token = r.body.token;
    }
    const bloqueado = await api('POST', '/auth/cambiar-modo', { token, body: { modo: 'proveedor' } });
    assert.equal(bloqueado.status, 429);
    assert.equal(bloqueado.body.bloqueado, true);
    // Otra cuenta desde la misma IP no se ve afectada.
    assert.equal((await api('POST', '/auth/cambiar-modo', { token: otro.token, body: { modo: 'cliente' } })).status, 200);
  });

  await t.test('activar el modo proveedor: los intentos fallidos también cuentan', async () => {
    const cliente = await registrar('cliente');
    for (let i = 0; i < 2; i += 1) {
      assert.equal((await api('POST', '/auth/ser-proveedor', { token: cliente.token, body: { oficio: 'Plomero', categoria_id: 999999 } })).status, 400);
    }
    assert.equal((await api('POST', '/auth/ser-proveedor', { token: cliente.token, body: { oficio: 'Plomero', categoria_id: 1 } })).status, 429);
  });
});
