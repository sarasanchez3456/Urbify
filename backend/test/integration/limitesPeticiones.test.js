// Límites de peticiones (issue #7): en las demás pruebas se suben a propósito; aquí se arrancan bajos para comprobar que de
// verdad bloquean con 429, que el bloqueo es por cuenta/correo (no deja fuera a otras personas) y que un inicio de sesión
// correcto no gasta el cupo.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, registrarSinVerificar, iniciarEntorno } = require('./helpers');

test('límites de peticiones de autenticación (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno({
    RATE_LIMIT_LOGIN_ACCOUNT_IP: '3',
    RATE_LIMIT_REGISTER_PER_HOUR: '6',
    RATE_LIMIT_RECOVERY_EMAIL_PER_HOUR: '2',
  });
  t.after(() => entorno.cerrar());

  const victima = await registrar('cliente');
  const otra = await registrar('cliente');
  const entrar = (correo, contrasena) => api('POST', '/auth/login', { body: { correo, contrasena } });
  const CLAVE = 'Clave-de-pruebas-1';

  await t.test('los inicios de sesión correctos no gastan el cupo de intentos fallidos', async () => {
    for (let i = 0; i < 6; i += 1) assert.equal((await entrar(victima.correo, CLAVE)).status, 200);
  });

  await t.test('tras 3 intentos fallidos a una cuenta desde la misma IP se bloquea (429) con cuenta regresiva', async () => {
    for (let i = 0; i < 3; i += 1) assert.equal((await entrar(victima.correo, 'clave-incorrecta-1')).status, 401);
    const bloqueado = await entrar(victima.correo, 'clave-incorrecta-1');
    assert.equal(bloqueado.status, 429);
    assert.equal(bloqueado.body.bloqueado, true);
    assert.ok(bloqueado.body.minutos_restantes >= 1);
  });

  await t.test('el bloqueo es por cuenta: otra persona desde la misma red entra con normalidad', async () => {
    assert.equal((await entrar(otra.correo, CLAVE)).status, 200);
  });

  await t.test('registro: tras superar el límite por IP responde 429 y antes se atiende con normalidad', async () => {
    const estados = [];
    for (let i = 0; i < 10; i += 1) estados.push((await registrarSinVerificar('cliente')).respuesta.status);
    assert.equal(estados[0], 202);
    assert.ok(estados.includes(429), `debió bloquear: ${estados}`);
    assert.ok(estados.filter((s) => s === 202).length <= 6, 'nunca se atienden más registros que el límite');
  });

  await t.test('recuperar contraseña: el límite por correo se aplica y no afecta a otros correos', async () => {
    const pedir = (correo) => api('POST', '/auth/olvido-contrasena', { body: { correo } });
    assert.equal((await pedir('ana.limite@pruebas.test')).status, 200);
    assert.equal((await pedir('ana.limite@pruebas.test')).status, 200);
    const tercera = await pedir('ana.limite@pruebas.test');
    assert.equal(tercera.status, 429);
    assert.equal(tercera.body.bloqueado, true);
    assert.equal((await pedir('otra.persona@pruebas.test')).status, 200);
  });
});
