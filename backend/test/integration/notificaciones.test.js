// Issue #37 (notificaciones): quién recibe cada aviso, qué datos trae (tipo y solicitud_id) y quién puede tocarlo.
// El contrato del que depende el frontend es: tipo 'mensaje' + solicitud_id abre el chat de esa solicitud, y las
// demás notificaciones traen su solicitud_id para abrir el detalle. La navegación misma (React) no se prueba aquí.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, crearServicio, fechaColombia, solicitar, solicitudEn, iniciarEntorno, contar } = require('./helpers');

test('notificaciones (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const proveedor = await registrar('proveedor');
  const cliente = await registrar('cliente');
  const tercero = await registrar('cliente');
  const servicioId = await crearServicio(proveedor, { titulo: 'Arreglo de fugas' });
  const notificacionesDe = async (u) => (await api('GET', '/notificaciones', { token: u.token })).body;
  const solicitudId = await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia(110, '10:00') });

  await t.test('crear una solicitud avisa al proveedor y confirma al cliente, ambos con solicitud_id', async () => {
    const delProveedor = (await notificacionesDe(proveedor)).filter((n) => n.solicitud_id === solicitudId);
    const delCliente = (await notificacionesDe(cliente)).filter((n) => n.solicitud_id === solicitudId);
    assert.equal(delProveedor.length, 1);
    assert.equal(delProveedor[0].tipo, 'solicitud');
    assert.match(delProveedor[0].mensaje, /Nueva solicitud de/);
    assert.equal(delCliente.length, 1);
    assert.equal(delCliente[0].tipo, 'solicitud');
  });

  await t.test('cambiar el estado avisa a la otra parte conservando el solicitud_id', async () => {
    assert.equal((await api('PUT', `/solicitudes/${solicitudId}/estado`, { token: proveedor.token, body: { estado: 'aceptada' } })).status, 200);
    const aviso = (await notificacionesDe(cliente)).find((n) => /aceptó tu solicitud/.test(n.mensaje));
    assert.ok(aviso, 'el cliente debe recibir el aviso de aceptación');
    assert.equal(aviso.tipo, 'solicitud');
    assert.equal(aviso.solicitud_id, solicitudId);
  });

  await t.test('un mensaje del chat notifica a la contraparte (tipo mensaje + solicitud_id) y no a quien lo escribe', async () => {
    const antesCliente = (await notificacionesDe(cliente)).filter((n) => n.tipo === 'mensaje').length;
    const r = await api('POST', `/solicitudes/${solicitudId}/mensajes`, { token: cliente.token, body: { contenido: 'Hola, ¿a qué hora llegas?' } });
    assert.equal(r.status, 201);
    const mensajes = (await notificacionesDe(proveedor)).filter((n) => n.tipo === 'mensaje');
    assert.equal(mensajes.length, 1);
    assert.equal(mensajes[0].solicitud_id, solicitudId);
    assert.equal(Number.isInteger(mensajes[0].solicitud_id), true);
    assert.match(mensajes[0].mensaje, /El cliente Carla Prueba te envió un mensaje sobre "Arreglo de fugas": "Hola, ¿a qué hora llegas\?"/);
    assert.equal((await notificacionesDe(cliente)).filter((n) => n.tipo === 'mensaje').length, antesCliente, 'quien escribe no se notifica a sí mismo');

    // Y a la inversa.
    assert.equal((await api('POST', `/solicitudes/${solicitudId}/mensajes`, { token: proveedor.token, body: { contenido: 'Llego a las 3pm' } })).status, 201);
    const alCliente = (await notificacionesDe(cliente)).filter((n) => n.tipo === 'mensaje');
    assert.equal(alCliente.length, 1);
    assert.equal(alCliente[0].solicitud_id, solicitudId);
    assert.match(alCliente[0].mensaje, /^El proveedor Pablo Prueba te envió un mensaje/);
  });

  await t.test('la vista previa del mensaje se recorta a 80 caracteres', async () => {
    const largo = 'x'.repeat(200);
    assert.equal((await api('POST', `/solicitudes/${solicitudId}/mensajes`, { token: cliente.token, body: { contenido: largo } })).status, 201);
    // El listado va por fecha y varios avisos pueden compartir el mismo segundo: el más reciente es el de id mayor.
    const ultimo = (await notificacionesDe(proveedor)).filter((n) => n.tipo === 'mensaje').sort((a, b) => b.id - a.id)[0];
    assert.ok(ultimo.mensaje.includes(`"${'x'.repeat(80)}…"`));
    assert.ok(!ultimo.mensaje.includes('x'.repeat(81)));
  });

  await t.test('un tercero no ve avisos ajenos ni puede leerlos o eliminarlos', async () => {
    assert.deepEqual(await notificacionesDe(tercero), []);
    const ajena = (await notificacionesDe(proveedor))[0];
    assert.equal((await api('PUT', `/notificaciones/${ajena.id}/leer`, { token: tercero.token })).status, 403);
    assert.equal((await api('DELETE', `/notificaciones/${ajena.id}`, { token: tercero.token })).status, 403);
    assert.equal((await api('PUT', '/notificaciones/999999/leer', { token: tercero.token })).status, 404);
    const fila = (await pool.execute('SELECT leida FROM notificaciones WHERE id = ?', [ajena.id]))[0][0];
    assert.equal(fila.leida, 0, 'el aviso ajeno no debe quedar leído');
    assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM notificaciones WHERE id = ?', [ajena.id]), 1, 'ni eliminado');
  });

  await t.test('marcar todas como leídas solo afecta las propias', async () => {
    const r = await api('PUT', '/notificaciones/leer-todas', { token: proveedor.token });
    assert.equal(r.status, 200);
    assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM notificaciones WHERE usuario_id = ? AND leida = 0', [proveedor.id]), 0);
    assert.ok(await contar(pool, 'SELECT COUNT(*) AS n FROM notificaciones WHERE usuario_id = ? AND leida = 0', [cliente.id]) > 0, 'las del cliente siguen sin leer');
  });

  await t.test('cada usuario puede marcar y eliminar sus propios avisos', async () => {
    const propia = (await notificacionesDe(cliente))[0];
    assert.equal((await api('PUT', `/notificaciones/${propia.id}/leer`, { token: cliente.token })).status, 200);
    assert.equal((await api('DELETE', `/notificaciones/${propia.id}`, { token: cliente.token })).status, 200);
    assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM notificaciones WHERE id = ?', [propia.id]), 0);
  });

  await t.test('el aviso se conserva como historial aunque se elimine la solicitud (solicitud_id queda en NULL)', async () => {
    const r = await solicitar(cliente, servicioId, fechaColombia(111, '10:00'));
    const id = r.body.solicitud.id;
    const aviso = (await notificacionesDe(proveedor)).find((n) => n.solicitud_id === id);
    assert.ok(aviso);
    assert.equal((await api('DELETE', `/solicitudes/${id}`, { token: cliente.token })).status, 200);
    const fila = (await pool.execute('SELECT solicitud_id FROM notificaciones WHERE id = ?', [aviso.id]))[0][0];
    assert.equal(fila.solicitud_id, null);
  });
});
