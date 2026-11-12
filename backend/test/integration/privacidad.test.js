// Issue #36: el teléfono y la dirección de la otra parte no salen del servidor mientras la solicitud no esté aceptada.
// Se prueba con peticiones directas a la API (como lo haría DevTools o curl), no con la interfaz.
const test = require('node:test');
const assert = require('node:assert/strict');
const { contactoDeSolicitudVisible, sqlSoloConContacto, ESTADOS_CON_CONTACTO } = require('../../src/utils/privacidad');
const { api, registrar, crearServicio, fechaColombia, solicitar, solicitudEn, iniciarEntorno } = require('./helpers');

const TEL_PROVEEDOR = '+573109998877';
const TEL_CLIENTE = '+573201112233';
const DIR_CLIENTE = 'Carrera 99 # 88-77, Medellín';

test('regla de contacto: solo aceptada, en proceso y completada', () => {
  for (const e of ['aceptada', 'en_proceso', 'completada']) assert.equal(contactoDeSolicitudVisible(e), true, e);
  for (const e of ['pendiente', 'cancelada', undefined, '']) assert.equal(contactoDeSolicitudVisible(e), false, String(e));
  assert.deepEqual(ESTADOS_CON_CONTACTO, ['aceptada', 'en_proceso', 'completada']);
  assert.match(sqlSoloConContacto('u.telefono'), /CASE WHEN sol\.estado IN \('aceptada', 'en_proceso', 'completada'\) THEN u\.telefono END/);
});

test('privacidad de contacto en las listas de solicitudes (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());

  const proveedor = await registrar('proveedor', { telefono: TEL_PROVEEDOR });
  const cliente = await registrar('cliente', { telefono: TEL_CLIENTE, direccion: DIR_CLIENTE });
  const servicioId = await crearServicio(proveedor);

  const listaCliente = async () => (await api('GET', '/solicitudes/cliente', { token: cliente.token })).body;
  const listaProveedor = async () => (await api('GET', '/solicitudes/proveedor', { token: proveedor.token })).body;
  const cruda = async (ruta, token) => JSON.stringify((await api('GET', ruta, { token })).body);

  await t.test('pendiente: ni el cliente ni el proveedor reciben el contacto de la otra parte', async () => {
    const id = await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia(10, '09:00') });
    const delCliente = (await listaCliente()).find((s) => s.id === id);
    const delProveedor = (await listaProveedor()).find((s) => s.id === id);
    assert.equal(delCliente.estado, 'pendiente');
    assert.equal(delCliente.proveedor_telefono, null);
    assert.equal(delProveedor.cliente_telefono, null);
    assert.equal(delProveedor.cliente_direccion, null);
    // Y en el texto completo de la respuesta HTTP tampoco aparece ningún rastro de esos datos.
    const textoCliente = await cruda('/solicitudes/cliente', cliente.token);
    const textoProveedor = await cruda('/solicitudes/proveedor', proveedor.token);
    assert.ok(!textoCliente.includes(TEL_PROVEEDOR), 'el teléfono del proveedor llegó al cliente');
    assert.ok(!textoProveedor.includes(TEL_CLIENTE), 'el teléfono del cliente llegó al proveedor');
    assert.ok(!textoProveedor.includes(DIR_CLIENTE), 'la dirección del perfil del cliente llegó al proveedor');
  });

  await t.test('aceptada, en proceso y completada: cada parte recibe el contacto autorizado', async () => {
    const fechas = { aceptada: '10:00', en_proceso: '12:00', completada: '14:00' };
    for (const [estado, hora] of Object.entries(fechas)) {
      const id = await solicitudEn(estado, { cliente, proveedor, servicioId, fecha: fechaColombia(11, hora) });
      const delCliente = (await listaCliente()).find((s) => s.id === id);
      const delProveedor = (await listaProveedor()).find((s) => s.id === id);
      assert.equal(delCliente.proveedor_telefono, TEL_PROVEEDOR, `cliente (${estado})`);
      assert.equal(delProveedor.cliente_telefono, TEL_CLIENTE, `proveedor (${estado})`);
      assert.equal(delProveedor.cliente_direccion, DIR_CLIENTE, `dirección (${estado})`);
    }
  });

  await t.test('cancelada (también después de haber sido aceptada): el contacto vuelve a ocultarse', async () => {
    const id = await solicitudEn('aceptada', { cliente, proveedor, servicioId, fecha: fechaColombia(12, '10:00') });
    const c = await api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'cancelada' } });
    assert.equal(c.status, 200);
    const delCliente = (await listaCliente()).find((s) => s.id === id);
    const delProveedor = (await listaProveedor()).find((s) => s.id === id);
    assert.equal(delCliente.proveedor_telefono, null);
    assert.equal(delProveedor.cliente_telefono, null);
    assert.equal(delProveedor.cliente_direccion, null);
  });

  await t.test('la solicitud pendiente sigue mostrando lo necesario para decidir (servicio, fecha, dirección del servicio)', async () => {
    const r = await solicitar(cliente, servicioId, fechaColombia(13, '09:00'), { direccion: 'Calle 5 # 10-20, Envigado' });
    assert.equal(r.status, 201);
    const delProveedor = (await listaProveedor()).find((s) => s.id === r.body.solicitud.id);
    assert.equal(delProveedor.estado, 'pendiente');
    assert.equal(delProveedor.direccion, 'Calle 5 # 10-20, Envigado');
    assert.ok(delProveedor.servicio_titulo);
    assert.ok(delProveedor.fecha_servicio);
    assert.equal(delProveedor.cliente_nombre, 'Carla');
  });
});
