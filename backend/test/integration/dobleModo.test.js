// Issue #45: una cuenta con capacidad de proveedor usa permisos del modo de su
// sesión. Estas pruebas cambian el estado directamente porque el endpoint de
// cambio de modo pertenece a la issue #46 y deliberadamente no existe aún.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, crearServicio, fechaColombia, solicitar, solicitudEn, iniciarEntorno, volverAdmin, contar } = require('./helpers');

async function fijarModo(pool, usuarioId, modo, { actualizarSesion = true } = {}) {
  await pool.execute('UPDATE usuarios SET modo_activo = ? WHERE id = ?', [modo, usuarioId]);
  if (actualizarSesion) await pool.execute('UPDATE tokens_sesion SET modo_activo = ? WHERE usuario_id = ?', [modo, usuarioId]);
}

test('doble modo: migración lógica, autorización, privacidad y reputaciones separadas (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const doble = await registrar('proveedor', { telefono: '+573001111111', direccion: 'Calle Doble 1, Bogotá' });
  const cliente = await registrar('cliente');
  const otroProveedor = await registrar('proveedor', { telefono: '+573002222222', direccion: 'Calle Otro 2, Bogotá' });
  const servicioDoble = await crearServicio(doble, { titulo: 'Servicio del doble modo' });
  const servicioAjeno = await crearServicio(otroProveedor, { titulo: 'Servicio del otro proveedor' });

  await t.test('la cuenta proveedor conserva capacidad de proveedor y empieza en ese modo', async () => {
    const [[u]] = await pool.execute('SELECT rol, es_proveedor, modo_activo FROM usuarios WHERE id = ?', [doble.id]);
    assert.deepEqual({ ...u, es_proveedor: Number(u.es_proveedor) }, { rol: 'proveedor', es_proveedor: 1, modo_activo: 'proveedor' });
    const perfil = await api('GET', '/auth/perfil', { token: doble.token });
    assert.equal(perfil.status, 200);
    assert.equal(perfil.body.es_proveedor, true, 'el contrato HTTP expone un booleano, no el 1 de MySQL');
    assert.equal(perfil.body.modo_activo, 'proveedor');
    assert.equal((await api('GET', '/servicios/mios', { token: doble.token })).status, 200);
    assert.equal((await api('POST', '/solicitudes', { token: doble.token, body: { servicio_id: servicioAjeno, fecha_servicio: fechaColombia(160, '10:00') } })).status, 403);
  });

  await t.test('el modo cliente bloquea rutas de proveedor, muestra contacto y conserva la regla anti-autosolicitud', async () => {
    // El modo de la cuenta sin actualizar la sesión revoca de inmediato el token anterior.
    await fijarModo(pool, doble.id, 'cliente', { actualizarSesion: false });
    assert.equal((await api('GET', '/auth/perfil', { token: doble.token })).status, 401);
    await pool.execute("UPDATE tokens_sesion SET modo_activo = 'cliente' WHERE usuario_id = ?", [doble.id]);

    assert.equal((await api('GET', '/servicios/mios', { token: doble.token })).status, 403);
    const detalle = await api('GET', `/servicios/${servicioAjeno}`, { token: doble.token });
    assert.equal(detalle.status, 200);
    assert.equal(detalle.body.telefono, '+573002222222');
    assert.equal(detalle.body.direccion, 'Calle Otro 2, Bogotá');
    const propia = await solicitar(doble, servicioDoble, fechaColombia(161, '10:00'));
    assert.equal(propia.status, 400);
    assert.match(propia.body.error, /ti mismo/);
  });

  await t.test('el modo proveedor bloquea rutas de cliente y conserva privacidad de proveedor', async () => {
    await fijarModo(pool, doble.id, 'proveedor');
    assert.equal((await api('GET', '/solicitudes/cliente', { token: doble.token })).status, 403);
    const detalle = await api('GET', `/servicios/${servicioAjeno}`, { token: doble.token });
    assert.equal(detalle.status, 200);
    assert.equal('telefono' in detalle.body, false);
    assert.equal('direccion' in detalle.body, false);
  });

  await t.test('las reputaciones como proveedor y como cliente quedan en tablas separadas', async () => {
    const solicitudProveedor = await solicitudEn('completada', {
      cliente, proveedor: doble, servicioId: servicioDoble, fecha: fechaColombia(162, '10:00'),
    });
    assert.equal((await api('POST', '/calificaciones', { token: cliente.token, body: { solicitud_id: solicitudProveedor, puntuacion: 5 } })).status, 201);

    await fijarModo(pool, doble.id, 'cliente');
    const r = await solicitar(doble, servicioAjeno, fechaColombia(163, '10:00'));
    assert.equal(r.status, 201);
    const solicitudCliente = r.body.solicitud.id;
    for (const estado of ['aceptada', 'en_proceso', 'completada']) {
      assert.equal((await api('PUT', `/solicitudes/${solicitudCliente}/estado`, { token: otroProveedor.token, body: { estado } })).status, 200);
    }
    assert.equal((await api('POST', '/calificaciones/cliente', { token: otroProveedor.token, body: { solicitud_id: solicitudCliente, puntuacion: 4 } })).status, 201);
    assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM calificaciones WHERE proveedor_id = ?', [doble.id]), 1);
    assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM calificaciones_cliente WHERE cliente_id = ?', [doble.id]), 1);
  });

  await t.test('un administrador sigue fuera del sistema de modos', async () => {
    const admin = await volverAdmin(pool, cliente);
    assert.equal((await api('GET', '/admin/resumen', { token: admin.token })).status, 200);
    const [[u]] = await pool.execute('SELECT es_proveedor, modo_activo FROM usuarios WHERE id = ?', [admin.id]);
    assert.equal(Number(u.es_proveedor), 0);
    assert.equal(u.modo_activo, null);
    const perfil = await api('GET', '/auth/perfil', { token: admin.token });
    assert.equal(perfil.status, 200);
    assert.equal(perfil.body.es_proveedor, false);
    assert.equal(perfil.body.modo_activo, null);
  });
});
