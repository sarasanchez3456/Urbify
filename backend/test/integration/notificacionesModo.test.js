// Notificaciones por modo: una cuenta con los dos modos (cliente y proveedor) solo ve en cada modo las notificaciones
// de ese modo (más las generales, sin modo), para no confundir un aviso recibido como cliente con uno como proveedor.
// El modo lo decide el servidor con la sesión; estas pruebas lo cambian directamente en la base porque el endpoint de
// cambio de modo pertenece a la issue #46.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, crearServicio, fechaColombia, solicitar, iniciarEntorno } = require('./helpers');

async function fijarModo(pool, usuarioId, modo) {
  await pool.execute('UPDATE usuarios SET modo_activo = ? WHERE id = ?', [modo, usuarioId]);
  await pool.execute('UPDATE tokens_sesion SET modo_activo = ? WHERE usuario_id = ?', [modo, usuarioId]);
}

test('notificaciones separadas por modo (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const doble = await registrar('proveedor');          // cuenta con los dos modos
  const cliente = await registrar('cliente');
  const otroProveedor = await registrar('proveedor');
  const servicioDoble = await crearServicio(doble, { titulo: 'Servicio del doble modo' });
  const servicioAjeno = await crearServicio(otroProveedor, { titulo: 'Servicio del otro proveedor' });

  const lista = async (usuario) => (await api('GET', '/notificaciones', { token: usuario.token })).body;
  const modos = (filas) => filas.map((n) => n.modo);
  const modoDe = async (id) => (await pool.execute('SELECT modo FROM notificaciones WHERE id = ?', [id]))[0][0]?.modo;
  const contarModo = async (usuarioId, modo) => Number((await pool.execute(
    'SELECT COUNT(*) AS n FROM notificaciones WHERE usuario_id = ? AND modo <=> ?', [usuarioId, modo]))[0][0].n);

  // Como proveedor, doble recibe la solicitud de un cliente.
  await fijarModo(pool, doble.id, 'proveedor');
  assert.equal((await solicitar(cliente, servicioDoble, fechaColombia(170, '10:00'))).status, 201);
  // Como cliente, doble pide un servicio a otro proveedor.
  await fijarModo(pool, doble.id, 'cliente');
  const pedido = await solicitar(doble, servicioAjeno, fechaColombia(171, '10:00'));
  assert.equal(pedido.status, 201);
  const solicitudComoCliente = pedido.body.solicitud.id;

  await t.test('cada notificación nace con el modo que el destinatario tiene en la solicitud', async () => {
    assert.equal(await contarModo(doble.id, 'proveedor'), 1, 'la solicitud recibida como proveedor');
    assert.equal(await contarModo(doble.id, 'cliente'), 1, 'la confirmación de la solicitud hecha como cliente');
    assert.equal(await contarModo(otroProveedor.id, 'proveedor'), 1);
    assert.equal(await contarModo(cliente.id, 'cliente'), 1);
  });

  await t.test('la lista solo trae las del modo de la sesión', async () => {
    const comoCliente = await lista(doble);
    assert.deepEqual(modos(comoCliente), ['cliente']);
    assert.match(comoCliente[0].mensaje, /Enviaste una solicitud/);

    await fijarModo(pool, doble.id, 'proveedor');
    const comoProveedor = await lista(doble);
    assert.deepEqual(modos(comoProveedor), ['proveedor']);
    assert.match(comoProveedor[0].mensaje, /Nueva solicitud de/);
  });

  await t.test('las notificaciones generales (sin modo) se ven en los dos modos', async () => {
    const [r] = await pool.execute("INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, 'Aviso general')", [doble.id]);
    for (const modo of ['cliente', 'proveedor']) {
      await fijarModo(pool, doble.id, modo);
      assert.ok((await lista(doble)).some((n) => n.id === r.insertId && n.modo === null), `debe verse en modo ${modo}`);
    }
  });

  await t.test('un mensaje del chat va al modo que el destinatario tiene en esa solicitud', async () => {
    // doble es el cliente de solicitudComoCliente: el proveedor le escribe y el aviso queda en modo cliente.
    assert.equal((await api('POST', `/solicitudes/${solicitudComoCliente}/mensajes`, { token: otroProveedor.token, body: { contenido: 'Hola, ¿a qué hora?' } })).status, 201);
    await fijarModo(pool, doble.id, 'cliente');
    const mensaje = (await lista(doble)).find((n) => n.tipo === 'mensaje');
    assert.ok(mensaje, 'debe verse en modo cliente');
    assert.equal(mensaje.modo, 'cliente');
    await fijarModo(pool, doble.id, 'proveedor');
    assert.equal((await lista(doble)).some((n) => n.tipo === 'mensaje'), false, 'no debe verse en modo proveedor');
  });

  await t.test('cambiar de estado avisa al modo correcto de cada parte', async () => {
    assert.equal((await api('PUT', `/solicitudes/${solicitudComoCliente}/estado`, { token: otroProveedor.token, body: { estado: 'aceptada' } })).status, 200);
    await fijarModo(pool, doble.id, 'cliente');
    assert.ok((await lista(doble)).some((n) => /aceptó tu solicitud/.test(n.mensaje)));
    await fijarModo(pool, doble.id, 'proveedor');
    assert.equal((await lista(doble)).some((n) => /aceptó tu solicitud/.test(n.mensaje)), false);
  });

  await t.test('desde un modo no se puede leer ni borrar por id una notificación del otro modo', async () => {
    await fijarModo(pool, doble.id, 'proveedor');
    const [[deCliente]] = await pool.execute("SELECT id FROM notificaciones WHERE usuario_id = ? AND modo = 'cliente' LIMIT 1", [doble.id]);
    assert.equal((await api('PUT', `/notificaciones/${deCliente.id}/leer`, { token: doble.token })).status, 404);
    assert.equal((await api('DELETE', `/notificaciones/${deCliente.id}`, { token: doble.token })).status, 404);
    assert.equal(await modoDe(deCliente.id), 'cliente', 'la notificación sigue ahí');
    // Y una ajena sigue siendo 403.
    const [[ajena]] = await pool.execute('SELECT id FROM notificaciones WHERE usuario_id = ? LIMIT 1', [cliente.id]);
    assert.equal((await api('PUT', `/notificaciones/${ajena.id}/leer`, { token: doble.token })).status, 403);
  });

  await t.test('marcar todas como leídas y borrar todas solo afectan al modo actual', async () => {
    await fijarModo(pool, doble.id, 'proveedor');
    assert.equal((await api('PUT', '/notificaciones/leer-todas', { token: doble.token })).status, 200);
    const sinLeer = async (modo) => Number((await pool.execute('SELECT COUNT(*) AS n FROM notificaciones WHERE usuario_id = ? AND modo <=> ? AND leida = 0', [doble.id, modo]))[0][0].n);
    assert.equal(await sinLeer('proveedor'), 0, 'las del modo actual quedan leídas');
    assert.ok(await sinLeer('cliente') > 0, 'las del otro modo siguen sin leer');

    const antesCliente = await contarModo(doble.id, 'cliente');
    assert.equal((await api('DELETE', '/notificaciones', { token: doble.token })).status, 200);
    assert.equal(await contarModo(doble.id, 'proveedor'), 0, 'se borraron las del modo actual');
    assert.equal(await contarModo(doble.id, 'cliente'), antesCliente, 'las del otro modo se conservan');
  });

  await t.test('una notificación que alguien se crea a sí mismo queda en el modo en que está', async () => {
    await fijarModo(pool, doble.id, 'cliente');
    const r = await api('POST', '/notificaciones', { token: doble.token, body: { usuario_id: doble.id, mensaje: 'Recordatorio' } });
    assert.equal(r.status, 201);
    assert.equal(await modoDe(r.body.id), 'cliente');
    await fijarModo(pool, doble.id, 'proveedor');
    assert.equal((await lista(doble)).some((n) => n.id === r.body.id), false);
  });

  await t.test('el administrador no tiene modo y ve todas sus notificaciones', async () => {
    const admin = await registrar('cliente');
    await pool.execute("UPDATE usuarios SET rol = 'admin', es_proveedor = 0, modo_activo = NULL WHERE id = ?", [admin.id]);
    await pool.execute('UPDATE tokens_sesion SET modo_activo = NULL WHERE usuario_id = ?', [admin.id]);
    await pool.execute("INSERT INTO notificaciones (usuario_id, modo, mensaje) VALUES (?, 'cliente', 'a'), (?, 'proveedor', 'b'), (?, NULL, 'c')", [admin.id, admin.id, admin.id]);
    assert.equal((await lista(admin)).filter((n) => ['a', 'b', 'c'].includes(n.mensaje)).length, 3);
  });
});
