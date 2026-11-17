// Cada inicio de sesión es una sesión propia: dos inicios a la vez (mismo segundo) no pueden dar el mismo token.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, iniciarEntorno } = require('./helpers');

test('sesiones independientes (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const usuario = await registrar('cliente');
  const iniciar = () => api('POST', '/auth/login', { body: { correo: usuario.correo, contrasena: 'Clave-de-pruebas-1' } });

  await t.test('varios inicios de sesión simultáneos dan tokens distintos, cada uno con su fila', async () => {
    const respuestas = await Promise.all(Array.from({ length: 8 }, iniciar));
    assert.ok(respuestas.every((r) => r.status === 200));
    const tokens = respuestas.map((r) => r.body.token);
    assert.equal(new Set(tokens).size, tokens.length, 'ningún token puede repetirse');
    for (const token of tokens) {
      const [filas] = await pool.execute('SELECT id FROM tokens_sesion WHERE token = ?', [token]);
      assert.equal(filas.length, 1, 'cada token tiene exactamente una fila');
    }
  });

  await t.test('cerrar una sesión no cierra las demás', async () => {
    const [a, b] = await Promise.all([iniciar(), iniciar()]);
    assert.notEqual(a.body.token, b.body.token);
    assert.equal((await api('POST', '/auth/logout', { token: a.body.token })).status, 200);
    assert.equal((await api('GET', '/auth/perfil', { token: a.body.token })).status, 401, 'la sesión cerrada ya no sirve');
    assert.equal((await api('GET', '/auth/perfil', { token: b.body.token })).status, 200, 'la otra sesión sigue abierta');
  });
});
