// Issue #37 (reprogramaciones): pedir, aceptar, rechazar y cancelar un cambio de fecha, con sus choques y concurrencia.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, crearServicio, fechaColombia, solicitudEn, solicitar, iniciarEntorno, contar } = require('./helpers');

const aMysql = (iso) => new Date(iso).toISOString().slice(0, 19).replace('T', ' ');

test('reprogramaciones de citas (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const proveedor = await registrar('proveedor');
  const cliente = await registrar('cliente');
  const otroCliente = await registrar('cliente');
  const servicioId = await crearServicio(proveedor);
  const base = { cliente, proveedor, servicioId };
  const proponer = (id, fecha, quien = cliente) => api('POST', `/solicitudes/${id}/reprogramaciones`, { token: quien.token, body: { fecha_propuesta: fecha } });
  const responder = (id, rid, accion, quien) => api('PUT', `/solicitudes/${id}/reprogramaciones/${rid}`, { token: quien.token, body: { accion } });
  const fechaEnBase = async (id) => new Date((await pool.execute('SELECT fecha_servicio FROM solicitudes WHERE id = ?', [id]))[0][0].fecha_servicio).getTime();
  const estadoReprog = async (rid) => (await pool.execute('SELECT estado FROM reprogramaciones WHERE id = ?', [rid]))[0][0].estado;

  await t.test('pedir un cambio válido lo deja pendiente', async () => {
    const id = await solicitudEn('aceptada', { ...base, fecha: fechaColombia(60, '10:00') });
    const r = await proponer(id, fechaColombia(61, '10:00'));
    assert.equal(r.status, 201);
    const lista = (await api('GET', `/solicitudes/${id}/reprogramaciones`, { token: cliente.token })).body;
    assert.equal(lista.length, 1);
    assert.equal(lista[0].estado, 'pendiente');
  });

  await t.test('no se permiten dos cambios pendientes para la misma solicitud', async () => {
    const id = await solicitudEn('aceptada', { ...base, fecha: fechaColombia(62, '10:00') });
    assert.equal((await proponer(id, fechaColombia(63, '10:00'))).status, 201);
    const segunda = await proponer(id, fechaColombia(64, '10:00'));
    assert.equal(segunda.status, 409);
    assert.equal(segunda.body.codigo, 'ya_pendiente');
    assert.equal(await contar(pool, "SELECT COUNT(*) AS n FROM reprogramaciones WHERE solicitud_id = ? AND estado = 'pendiente'", [id]), 1);
  });

  await t.test('aceptar: la cita se mueve a la fecha propuesta; no se puede responder dos veces', async () => {
    const id = await solicitudEn('aceptada', { ...base, fecha: fechaColombia(65, '10:00') });
    const nueva = fechaColombia(66, '10:00');
    const rid = (await proponer(id, nueva)).body.reprogramacion.id;
    const ok = await responder(id, rid, 'aceptar', proveedor);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.estado, 'aceptada');
    assert.equal(await fechaEnBase(id), new Date(nueva).getTime());
    assert.equal(await estadoReprog(rid), 'aceptada');
    assert.equal((await responder(id, rid, 'aceptar', proveedor)).status, 409);
    assert.equal((await responder(id, rid, 'rechazar', proveedor)).status, 409);
  });

  await t.test('rechazar: la cita sigue en su fecha anterior', async () => {
    const original = fechaColombia(67, '10:00');
    const id = await solicitudEn('aceptada', { ...base, fecha: original });
    const rid = (await proponer(id, fechaColombia(68, '10:00'))).body.reprogramacion.id;
    const r = await responder(id, rid, 'rechazar', proveedor);
    assert.equal(r.status, 200);
    assert.equal(await estadoReprog(rid), 'rechazada');
    assert.equal(await fechaEnBase(id), new Date(original).getTime());
    // Después de rechazar se puede proponer otra hora.
    assert.equal((await proponer(id, fechaColombia(69, '10:00'))).status, 201);
  });

  await t.test('cancelar: solo quien lo pidió; el profesional recibe 403', async () => {
    const id = await solicitudEn('aceptada', { ...base, fecha: fechaColombia(70, '10:00') });
    const rid = (await proponer(id, fechaColombia(71, '10:00'))).body.reprogramacion.id;
    assert.equal((await responder(id, rid, 'cancelar', proveedor)).status, 403);
    assert.equal(await estadoReprog(rid), 'pendiente');
    const ok = await responder(id, rid, 'cancelar', cliente);
    assert.equal(ok.status, 200);
    assert.equal(await estadoReprog(rid), 'cancelada');
  });

  await t.test('el cliente no puede aceptar ni rechazar; el proveedor no puede pedir el cambio', async () => {
    const id = await solicitudEn('aceptada', { ...base, fecha: fechaColombia(72, '10:00') });
    const rid = (await proponer(id, fechaColombia(73, '10:00'))).body.reprogramacion.id;
    assert.equal((await responder(id, rid, 'aceptar', cliente)).status, 403);
    assert.equal((await responder(id, rid, 'rechazar', cliente)).status, 403);
    assert.equal((await proponer(id, fechaColombia(74, '10:00'), proveedor)).status, 403);
    assert.equal(await estadoReprog(rid), 'pendiente');
  });

  await t.test('una fecha que ya dejó de estar disponible no se puede aceptar (409 ocupado)', async () => {
    const id = await solicitudEn('aceptada', { ...base, fecha: fechaColombia(75, '10:00') });
    const original = await fechaEnBase(id);
    const nueva = fechaColombia(76, '11:00');
    const rid = (await proponer(id, nueva)).body.reprogramacion.id;
    // Se simula una carrera: alguien queda con esa hora por una vía que no pasó por la reserva normal.
    await pool.execute("INSERT INTO solicitudes (cliente_id, proveedor_id, servicio_id, estado, fecha_servicio) VALUES (?, ?, ?, 'pendiente', ?)",
      [otroCliente.id, proveedor.id, servicioId, aMysql(nueva)]);
    const r = await responder(id, rid, 'aceptar', proveedor);
    assert.equal(r.status, 409);
    assert.equal(r.body.codigo, 'ocupado');
    assert.equal(await estadoReprog(rid), 'pendiente');
    assert.equal(await fechaEnBase(id), original, 'la cita no debe cambiar de fecha');
  });

  await t.test('no se puede proponer una hora ocupada, la misma fecha, una fecha pasada ni en un estado que no lo admite', async () => {
    const id = await solicitudEn('aceptada', { ...base, fecha: fechaColombia(77, '10:00') });
    assert.equal((await solicitar(otroCliente, servicioId, fechaColombia(78, '10:00'))).status, 201);
    const ocupada = await proponer(id, fechaColombia(78, '10:30'));
    assert.equal(ocupada.status, 409);
    assert.equal(ocupada.body.codigo, 'ocupado');
    assert.equal((await proponer(id, fechaColombia(77, '10:00'))).status, 400, 'la misma fecha');
    assert.equal((await proponer(id, fechaColombia(-2, '10:00'))).status, 400, 'fecha pasada');
    assert.equal((await api('POST', `/solicitudes/${id}/reprogramaciones`, { token: cliente.token, body: {} })).status, 400);

    const enProceso = await solicitudEn('en_proceso', { ...base, fecha: fechaColombia(79, '10:00') });
    assert.equal((await proponer(enProceso, fechaColombia(80, '10:00'))).status, 400, 'en proceso ya no se reprograma');
  });

  await t.test('al iniciar o cancelar la solicitud, el cambio pendiente se cancela solo', async () => {
    const id = await solicitudEn('aceptada', { ...base, fecha: fechaColombia(81, '10:00') });
    const rid = (await proponer(id, fechaColombia(82, '10:00'))).body.reprogramacion.id;
    const ep = await api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'en_proceso' } });
    assert.equal(ep.status, 200);
    assert.equal(await estadoReprog(rid), 'cancelada');
  });

  await t.test('dos respuestas simultáneas al mismo cambio: una se aplica y la otra recibe 409', async () => {
    const id = await solicitudEn('aceptada', { ...base, fecha: fechaColombia(83, '10:00') });
    const rid = (await proponer(id, fechaColombia(84, '10:00'))).body.reprogramacion.id;
    const [a, b] = await Promise.all([responder(id, rid, 'aceptar', proveedor), responder(id, rid, 'rechazar', proveedor)]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    assert.ok(['aceptada', 'rechazada'].includes(await estadoReprog(rid)));
  });

  await t.test('aceptar el cambio y cancelar la solicitud a la vez: sin errores 500 y sin pendientes colgados', async () => {
    for (let i = 0; i < 4; i += 1) {
      const id = await solicitudEn('aceptada', { ...base, fecha: fechaColombia(90 + i * 3, '10:00') });
      const rid = (await proponer(id, fechaColombia(91 + i * 3, '10:00'))).body.reprogramacion.id;
      const [aceptar, cancelar] = await Promise.all([
        responder(id, rid, 'aceptar', proveedor),
        api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'cancelada' } }),
      ]);
      assert.ok([200, 409].includes(aceptar.status), `aceptar devolvió ${aceptar.status}`);
      assert.ok([200, 409].includes(cancelar.status), `cancelar devolvió ${cancelar.status}`);
      assert.equal(await contar(pool, "SELECT COUNT(*) AS n FROM reprogramaciones WHERE solicitud_id = ? AND estado = 'pendiente'", [id]), 0, 'no debe quedar un cambio pendiente');
      const estado = (await pool.execute('SELECT estado FROM solicitudes WHERE id = ?', [id]))[0][0].estado;
      assert.ok(['aceptada', 'cancelada'].includes(estado));
    }
  });
});
