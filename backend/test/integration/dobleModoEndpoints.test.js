// Issue #46: ser proveedor y cambiar de modo. El modo vive en la sesión; cada cambio reemite el token de ESA sesión.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, volverAdmin, iniciarEntorno } = require('./helpers');

const CLAVE = 'Clave-de-pruebas-1';

test('doble modo: ser proveedor y cambiar de modo (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const iniciar = (correo) => api('POST', '/auth/login', { body: { correo, contrasena: CLAVE } });
  const ser = (token, cuerpo = { oficio: 'Plomero', categoria_id: 1 }) => api('POST', '/auth/ser-proveedor', { token, body: cuerpo });
  const cambiar = (token, modo) => api('POST', '/auth/cambiar-modo', { token, body: { modo } });
  const enModoCliente = async (token) => (await api('GET', '/solicitudes/cliente', { token })).status === 200;
  const enModoProveedor = async (token) => (await api('GET', '/servicios/mios', { token })).status === 200;
  const filaDeUsuario = async (id) => (await pool.execute('SELECT * FROM usuarios WHERE id = ?', [id]))[0][0];

  await t.test('un cliente se habilita como proveedor: pasa a modo proveedor, con token nuevo y sin verificar otra vez', async () => {
    const cliente = await registrar('cliente');
    assert.equal(await enModoCliente(cliente.token), true);
    assert.equal(await enModoProveedor(cliente.token), false);

    const r = await ser(cliente.token, { oficio: '  Plomero  ', categoria_id: 1 });
    assert.equal(r.status, 200);
    assert.ok(r.body.token && r.body.token !== cliente.token, 'se entrega un token nuevo');
    assert.equal(r.body.usuario.es_proveedor, true);
    assert.equal(r.body.usuario.modo_activo, 'proveedor');
    assert.equal(r.body.usuario.oficio, 'Plomero', 'el oficio se guarda sin espacios sobrantes');

    assert.equal((await api('GET', '/auth/perfil', { token: cliente.token })).status, 401, 'el token anterior deja de servir');
    assert.equal(await enModoProveedor(r.body.token), true);
    assert.equal(await enModoCliente(r.body.token), false);
    const u = await filaDeUsuario(cliente.id);
    assert.equal(u.es_proveedor, 1);
    assert.equal(u.modo_activo, 'proveedor');
    assert.equal(u.correo_verificado, 1, 'el correo sigue verificado: no se pide otro código');
  });

  await t.test('ser proveedor valida los datos: oficio obligatorio, categoría existente (acepta número como texto)', async () => {
    const cliente = await registrar('cliente');
    for (const cuerpo of [{}, { oficio: '' }, { oficio: '   ', categoria_id: 1 }, { oficio: 'x'.repeat(101), categoria_id: 1 },
      { oficio: 'Plomero' }, { oficio: 'Plomero', categoria_id: 0 }, { oficio: 'Plomero', categoria_id: 'abc' },
      { oficio: { $ne: '' }, categoria_id: 1 }]) {
      assert.equal((await ser(cliente.token, cuerpo)).status, 400, `debe rechazar ${JSON.stringify(cuerpo)}`);
    }
    assert.equal((await ser(cliente.token, { oficio: 'Plomero', categoria_id: 999999 })).status, 400, 'categoría inexistente');
    assert.equal((await filaDeUsuario(cliente.id)).es_proveedor, 0, 'nada cambió tras los rechazos');
    assert.equal((await ser(cliente.token, { oficio: 'Plomero', categoria_id: '1' })).status, 200);
  });

  await t.test('ser proveedor: sin sesión 401, administrador 403, quien ya es proveedor 409', async () => {
    assert.equal((await api('POST', '/auth/ser-proveedor', { body: { oficio: 'Plomero', categoria_id: 1 } })).status, 401);
    const admin = await volverAdmin(pool, await registrar('cliente'));
    assert.equal((await ser(admin.token)).status, 403);
    const proveedor = await registrar('proveedor');
    assert.equal((await ser(proveedor.token)).status, 409);
  });

  await t.test('dos activaciones a la vez: solo una se aplica', async () => {
    const cliente = await registrar('cliente');
    const [a, b] = await Promise.all([ser(cliente.token), ser(cliente.token)]);
    const estados = [a.status, b.status].sort();
    assert.equal(estados[0], 200);
    assert.ok([401, 409].includes(estados[1]), `la otra debe fallar, pero fue ${estados[1]}`);
    const [[{ n }]] = await pool.execute('SELECT COUNT(*) AS n FROM tokens_sesion WHERE usuario_id = ?', [cliente.id]);
    assert.equal(Number(n), 1, 'queda una sola sesión');
  });

  await t.test('cambiar de modo: reemite el token, el anterior deja de servir y se conserva el vencimiento', async () => {
    const proveedor = await registrar('proveedor');
    const [[antes]] = await pool.execute('SELECT expira_en FROM tokens_sesion WHERE token = ?', [proveedor.token]);

    const r = await cambiar(proveedor.token, 'cliente');
    assert.equal(r.status, 200);
    assert.equal(r.body.usuario.modo_activo, 'cliente');
    assert.notEqual(r.body.token, proveedor.token);
    assert.equal((await api('GET', '/auth/perfil', { token: proveedor.token })).status, 401);
    assert.equal(await enModoCliente(r.body.token), true);
    assert.equal(await enModoProveedor(r.body.token), false);
    const [[despues]] = await pool.execute('SELECT expira_en FROM tokens_sesion WHERE token = ?', [r.body.token]);
    assert.equal(new Date(despues.expira_en).getTime(), new Date(antes.expira_en).getTime(), 'cambiar de modo no alarga la sesión');

    const vuelta = await cambiar(r.body.token, 'proveedor');
    assert.equal(vuelta.status, 200);
    assert.equal(await enModoProveedor(vuelta.body.token), true);
    assert.equal((await api('GET', '/auth/perfil', { token: vuelta.body.token })).body.modo_activo, 'proveedor');
  });

  await t.test('cada dispositivo tiene su modo: cambiar en uno no toca el otro', async () => {
    const proveedor = await registrar('proveedor');
    const celular = (await iniciar(proveedor.correo)).body.token;
    const cambio = await cambiar(proveedor.token, 'cliente');
    assert.equal(cambio.status, 200);
    assert.equal(await enModoCliente(cambio.body.token), true);
    assert.equal(await enModoProveedor(celular), true, 'el celular sigue en modo proveedor');
    assert.equal((await api('GET', '/auth/perfil', { token: celular })).status, 200, 'su sesión sigue vigente');
  });

  await t.test('el último modo usado es con el que empieza el próximo inicio de sesión', async () => {
    const proveedor = await registrar('proveedor');
    await cambiar(proveedor.token, 'cliente');
    assert.equal((await iniciar(proveedor.correo)).body.usuario.modo_activo, 'cliente');
  });

  await t.test('modo proveedor solo si la cuenta está habilitada; modo inválido; mismo modo; sin sesión; administrador', async () => {
    const cliente = await registrar('cliente');
    assert.equal((await cambiar(cliente.token, 'proveedor')).status, 403);
    assert.equal(await enModoCliente(cliente.token), true, 'la sesión sigue igual tras el rechazo');
    for (const modo of ['admin', 'Proveedor', '', null, 1]) assert.equal((await cambiar(cliente.token, modo)).status, 400, `modo ${JSON.stringify(modo)}`);
    const igual = await cambiar(cliente.token, 'cliente');
    assert.equal(igual.status, 200);
    assert.equal(igual.body.token, cliente.token, 'pedir el mismo modo no cambia el token');
    assert.equal((await api('POST', '/auth/cambiar-modo', { body: { modo: 'cliente' } })).status, 401);
    const admin = await volverAdmin(pool, await registrar('cliente'));
    assert.equal((await cambiar(admin.token, 'cliente')).status, 403);
  });

  await t.test('dos cambios de modo a la vez con el mismo token: solo uno se aplica y queda una sola sesión', async () => {
    const proveedor = await registrar('proveedor');
    const [a, b] = await Promise.all([cambiar(proveedor.token, 'cliente'), cambiar(proveedor.token, 'cliente')]);
    const estados = [a.status, b.status].sort();
    assert.equal(estados[0], 200);
    assert.ok([200, 401].includes(estados[1]));
    const [[{ n }]] = await pool.execute('SELECT COUNT(*) AS n FROM tokens_sesion WHERE usuario_id = ?', [proveedor.id]);
    assert.equal(Number(n), 1, 'no quedan sesiones duplicadas ni huérfanas');
  });

  await t.test('una cuenta que pierde la capacidad de proveedor no puede seguir en ese modo, y las rutas de un modo no sirven en el otro', async () => {
    const cliente = await registrar('cliente');
    const r = await ser(cliente.token);
    await pool.execute("UPDATE usuarios SET es_proveedor = 0, modo_activo = 'cliente' WHERE id = ?", [cliente.id]); // la base exige coherencia: sin capacidad no hay modo proveedor
    assert.equal((await api('GET', '/servicios/mios', { token: r.body.token })).status, 401);
    assert.equal((await cambiar(r.body.token, 'cliente')).status, 401);
  });
});
