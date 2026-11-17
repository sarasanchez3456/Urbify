// Panel de administración con el doble modo (una cuenta registrada como cliente que ofrece servicios) y mensaje claro al
// iniciar sesión con una cuenta suspendida.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, volverAdmin, iniciarEntorno } = require('./helpers');

const MOTIVO = 'Motivo de prueba suficientemente largo';
const CLAVE = 'Clave-de-pruebas-1';

test('administración: doble modo y cuentas suspendidas (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const admin = await volverAdmin(pool, await registrar('cliente'));
  const iniciar = (correo, contrasena = CLAVE) => api('POST', '/auth/login', { body: { correo, contrasena } });

  await t.test('una cuenta registrada como cliente que ofrece servicios se ve con los dos modos en el panel', async () => {
    const soloCliente = await registrar('cliente');
    const doble = await registrar('cliente');
    const proveedor = await registrar('proveedor');
    assert.equal((await api('POST', '/auth/ser-proveedor', { token: doble.token, body: { oficio: 'Plomero', categoria_id: 1 } })).status, 200);

    const lista = await api('GET', '/auth/', { token: admin.token });
    assert.equal(lista.status, 200);
    const de = (u) => lista.body.find((x) => x.id === u.id);
    assert.equal(de(soloCliente).rol, 'cliente');
    assert.equal(de(soloCliente).es_proveedor, false);
    assert.equal(de(doble).rol, 'cliente', 'el rol histórico no cambia');
    assert.equal(de(doble).es_proveedor, true, 'pero el panel recibe que ahora también ofrece servicios');
    assert.equal(de(proveedor).es_proveedor, true);

    const detalle = await api('GET', `/admin/usuarios/${doble.id}`, { token: admin.token });
    assert.equal(detalle.status, 200);
    assert.equal(detalle.body.es_proveedor, true);

    const resumen = await api('GET', '/admin/resumen', { token: admin.token });
    assert.equal(resumen.status, 200);
    const cuentas = resumen.body.cuentas_por_capacidad_y_modo;
    assert.ok(cuentas.con_ambos_modos >= 1, 'el resumen cuenta las cuentas con los dos modos');
    assert.ok(cuentas.con_capacidad_proveedor >= cuentas.con_ambos_modos);
    // Solo cuenta a las registradas como cliente que ofrecen servicios (el proveedor registrado como tal no es "ambos").
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'cliente' AND es_proveedor = 1");
    assert.equal(cuentas.con_ambos_modos, Number(n));
  });

  await t.test('cuenta suspendida: con la contraseña correcta se dice que está suspendida (403); con otra, sigue siendo 401', async () => {
    const u = await registrar('cliente');
    const suspender = await api('PUT', `/admin/usuarios/${u.id}/estado`, { token: admin.token, body: { activo: false, motivo: MOTIVO } });
    assert.equal(suspender.status, 200);

    const claro = await iniciar(u.correo);
    assert.equal(claro.status, 403);
    assert.equal(claro.body.codigo, 'cuenta_suspendida');
    assert.match(claro.body.error, /suspendida/i);
    assert.equal(claro.body.token, undefined, 'no se entrega sesión');

    // Un tercero que solo conoce el correo no puede saber si existe o está suspendida.
    const incorrecta = await iniciar(u.correo, 'otra-clave-que-no-es-1');
    const inexistente = await iniciar('nadie.existe@pruebas.test', 'otra-clave-que-no-es-1');
    assert.equal(incorrecta.status, 401);
    assert.equal(inexistente.status, 401);
    assert.deepEqual(incorrecta.body, inexistente.body, 'misma respuesta con contraseña incorrecta, exista o no la cuenta');

    // El token anterior también dejó de valer (ya ocurría), y al reactivarla vuelve a entrar con normalidad.
    assert.equal((await api('GET', '/auth/perfil', { token: u.token })).status, 401);
    assert.equal((await api('PUT', `/admin/usuarios/${u.id}/estado`, { token: admin.token, body: { activo: true, motivo: MOTIVO } })).status, 200);
    assert.equal((await iniciar(u.correo)).status, 200);
  });

  await t.test('una cuenta suspendida y sin verificar sigue diciendo "suspendida" (no pide el código de correo)', async () => {
    const u = await registrar('cliente');
    await pool.execute('UPDATE usuarios SET activo = 0, correo_verificado = 0 WHERE id = ?', [u.id]);
    const r = await iniciar(u.correo);
    assert.equal(r.status, 403);
    assert.equal(r.body.codigo, 'cuenta_suspendida');
  });
});
