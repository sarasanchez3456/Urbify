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
  const clienteConCapacidad = await registrar('cliente');
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
    // El modo vive en la sesión: cambiar el modo de la cuenta (el que usará el próximo inicio de sesión) no toca
    // una sesión ya abierta, que sigue en su propio modo.
    await fijarModo(pool, doble.id, 'cliente', { actualizarSesion: false });
    const sinCambio = await api('GET', '/auth/perfil', { token: doble.token });
    assert.equal(sinCambio.status, 200);
    assert.equal(sinCambio.body.modo_activo, 'proveedor');
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

  await t.test('el modo vive en la sesión: dos dispositivos de la misma cuenta conviven en modos distintos', async () => {
    await fijarModo(pool, doble.id, 'cliente'); // el próximo inicio de sesión empieza en modo cliente
    const login = await api('POST', '/auth/login', { body: { correo: doble.correo, contrasena: 'Clave-de-pruebas-1' } });
    assert.equal(login.status, 200);
    assert.equal(login.body.usuario.modo_activo, 'cliente');
    const celular = login.body.token;
    await pool.execute("UPDATE tokens_sesion SET modo_activo = 'proveedor' WHERE token = ?", [doble.token]);

    assert.equal((await api('GET', '/servicios/mios', { token: doble.token })).status, 200);
    assert.equal((await api('GET', '/solicitudes/cliente', { token: doble.token })).status, 403);
    assert.equal((await api('GET', '/servicios/mios', { token: celular })).status, 403);
    assert.equal((await api('GET', '/solicitudes/cliente', { token: celular })).status, 200);
    assert.equal((await api('GET', '/auth/perfil', { token: doble.token })).body.modo_activo, 'proveedor');
    assert.equal((await api('GET', '/auth/perfil', { token: celular })).body.modo_activo, 'cliente');

    // Una sesión en modo proveedor deja de valer si la cuenta pierde la capacidad; la de modo cliente sigue.
    await pool.execute('UPDATE usuarios SET es_proveedor = 0 WHERE id = ?', [doble.id]);
    assert.equal((await api('GET', '/auth/perfil', { token: doble.token })).status, 401);
    assert.equal((await api('GET', '/auth/perfil', { token: celular })).status, 200);
    await pool.execute('UPDATE usuarios SET es_proveedor = 1 WHERE id = ?', [doble.id]);
    assert.equal((await api('GET', '/auth/perfil', { token: doble.token })).status, 200);
    await fijarModo(pool, doble.id, 'proveedor');
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
    // #46 será quien conceda esta capacidad; aquí se prepara directamente para
    // comprobar que administración no confunde capacidad/mode con rol histórico.
    await pool.execute("UPDATE usuarios SET es_proveedor = 1, modo_activo = 'proveedor' WHERE id = ?", [clienteConCapacidad.id]);
    const admin = await volverAdmin(pool, cliente);
    assert.equal((await api('GET', '/admin/resumen', { token: admin.token })).status, 200);
    const [[u]] = await pool.execute('SELECT es_proveedor, modo_activo FROM usuarios WHERE id = ?', [admin.id]);
    assert.equal(Number(u.es_proveedor), 0);
    assert.equal(u.modo_activo, null);
    const perfil = await api('GET', '/auth/perfil', { token: admin.token });
    assert.equal(perfil.status, 200);
    assert.equal(perfil.body.es_proveedor, false);
    assert.equal(perfil.body.modo_activo, null);

    const detalle = await api('GET', `/admin/usuarios/${clienteConCapacidad.id}`, { token: admin.token });
    assert.equal(detalle.status, 200);
    assert.equal(detalle.body.rol, 'cliente');
    assert.equal(detalle.body.es_proveedor, true);
    assert.equal(detalle.body.modo_activo, 'proveedor');

    const lista = await api('GET', '/auth', { token: admin.token });
    const enLista = lista.body.find((u) => u.id === clienteConCapacidad.id);
    assert.equal(enLista.es_proveedor, true);
    assert.equal(enLista.modo_activo, 'proveedor');

    const esperado = {
      con_capacidad_proveedor: 3,
      con_ambos_modos: 1, // clienteConCapacidad: registrado como cliente y habilitado como proveedor
      en_modo_cliente: 1,
      en_modo_proveedor: 2,
      administradores: 1,
    };
    const resumen = await api('GET', '/admin/resumen', { token: admin.token });
    assert.deepEqual(resumen.body.usuarios_por_rol, { cliente: 1, proveedor: 2, admin: 1 });
    assert.deepEqual(resumen.body.cuentas_por_capacidad_y_modo, esperado);
    const stats = await api('GET', '/stats/admin', { token: admin.token });
    assert.equal(stats.status, 200);
    assert.deepEqual(stats.body.usuarios_por_rol, { cliente: 1, proveedor: 2, admin: 1 });
    assert.deepEqual(stats.body.cuentas_por_capacidad_y_modo, esperado);
  });
});
