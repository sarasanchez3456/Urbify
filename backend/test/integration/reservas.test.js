// Issue #37 (reservas y concurrencia): una hora del proveedor no se puede reservar dos veces.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, crearServicio, fechaColombia, diaSemana, solicitar, iniciarEntorno, contar } = require('./helpers');

test('reservas sin choques ni dobles reservas (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const proveedor = await registrar('proveedor');
  const servicioId = await crearServicio(proveedor);
  const clienteA = await registrar('cliente');
  const clienteB = await registrar('cliente');
  const activas = (idProveedor) => contar(pool, "SELECT COUNT(*) AS n FROM solicitudes WHERE proveedor_id = ? AND estado IN ('pendiente','aceptada','en_proceso')", [idProveedor]);

  await t.test('dos clientes piden a la vez la misma hora: se crea una sola reserva y la otra recibe 409', async () => {
    const fecha = fechaColombia(40, '10:00');
    const [a, b] = await Promise.all([solicitar(clienteA, servicioId, fecha), solicitar(clienteB, servicioId, fecha)]);
    assert.deepEqual([a.status, b.status].sort(), [201, 409]);
    const perdedora = a.status === 409 ? a : b;
    assert.equal(perdedora.body.codigo, 'ocupado');
    assert.equal(await activas(proveedor.id), 1, 'no pueden quedar dos solicitudes activas en la misma hora');
  });

  await t.test('carrera con varios clientes a la vez: gana uno solo', async () => {
    const clientes = await Promise.all([1, 2, 3, 4].map(() => registrar('cliente')));
    const fecha = fechaColombia(41, '15:00');
    const respuestas = await Promise.all(clientes.map((c) => solicitar(c, servicioId, fecha)));
    assert.equal(respuestas.filter((r) => r.status === 201).length, 1);
    assert.equal(respuestas.filter((r) => r.status === 409).length, 3);
  });

  await t.test('no se puede reservar encima de una cita existente (menos de 60 minutos de diferencia)', async () => {
    assert.equal((await solicitar(clienteA, servicioId, fechaColombia(42, '10:00'))).status, 201);
    for (const hora of ['10:00', '10:30', '09:30', '09:01']) {
      const r = await solicitar(clienteB, servicioId, fechaColombia(42, hora));
      assert.equal(r.status, 409, `a las ${hora} debería chocar`);
      assert.equal(r.body.codigo, 'ocupado');
    }
    // Exactamente 60 minutos de diferencia ya no choca.
    assert.equal((await solicitar(clienteB, servicioId, fechaColombia(42, '11:00'))).status, 201);
    assert.equal((await solicitar(clienteB, servicioId, fechaColombia(42, '09:00'))).status, 201);
  });

  await t.test('una cita cancelada libera la hora', async () => {
    const r = await solicitar(clienteA, servicioId, fechaColombia(43, '10:00'));
    assert.equal(r.status, 201);
    assert.equal((await solicitar(clienteB, servicioId, fechaColombia(43, '10:00'))).status, 409);
    const c = await api('PUT', `/solicitudes/${r.body.solicitud.id}/estado`, { token: clienteA.token, body: { estado: 'cancelada' } });
    assert.equal(c.status, 200);
    assert.equal((await solicitar(clienteB, servicioId, fechaColombia(43, '10:00'))).status, 201);
  });

  await t.test('también choca con una hora propuesta por un cambio de fecha pendiente', async () => {
    const r = await solicitar(clienteA, servicioId, fechaColombia(44, '09:00'));
    assert.equal(r.status, 201);
    const ac = await api('PUT', `/solicitudes/${r.body.solicitud.id}/estado`, { token: proveedor.token, body: { estado: 'aceptada' } });
    assert.equal(ac.status, 200);
    const p = await api('POST', `/solicitudes/${r.body.solicitud.id}/reprogramaciones`, { token: clienteA.token, body: { fecha_propuesta: fechaColombia(45, '16:00') } });
    assert.equal(p.status, 201);
    const otro = await solicitar(clienteB, servicioId, fechaColombia(45, '16:00'));
    assert.equal(otro.status, 409);
  });

  await t.test('con horario configurado solo se reserva dentro de él; fuera de horario recibe 409', async () => {
    const otroProveedor = await registrar('proveedor');
    const servicio2 = await crearServicio(otroProveedor);
    const dia = fechaColombia(50, '12:00');
    const franja = { dia_semana: diaSemana(dia), hora_inicio: '08:00', hora_fin: '12:00' };
    const g = await api('PUT', '/proveedores/mi-horario', { token: otroProveedor.token, body: { franjas: [franja] } });
    assert.equal(g.status, 200);

    const antes = await contar(pool, 'SELECT COUNT(*) AS n FROM solicitudes WHERE proveedor_id = ?', [otroProveedor.id]);
    for (const hora of ['12:00', '14:00', '07:00', '11:30']) {   // 11:30 termina a las 12:30: se pasa de la franja
      const r = await solicitar(clienteA, servicio2, fechaColombia(50, hora));
      assert.equal(r.status, 409, `a las ${hora} está fuera de horario`);
      assert.equal(r.body.codigo, 'fuera_de_horario');
    }
    // Otro día de la semana sin franja tampoco se atiende.
    const otroDia = await solicitar(clienteA, servicio2, fechaColombia(51, '09:00'));
    assert.equal(otroDia.status, 409);
    assert.equal(otroDia.body.codigo, 'fuera_de_horario');
    assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM solicitudes WHERE proveedor_id = ?', [otroProveedor.id]), antes, 'no se creó ninguna solicitud');

    for (const hora of ['08:00', '10:00', '11:00']) {
      assert.equal((await solicitar(clienteA, servicio2, fechaColombia(50, hora))).status, 201, `a las ${hora} sí se atiende`);
    }
  });

  await t.test('una fecha pasada o sin fecha se rechaza con 400', async () => {
    assert.equal((await solicitar(clienteA, servicioId, fechaColombia(-1, '10:00'))).status, 400);
    const sinFecha = await api('POST', '/solicitudes', { token: clienteA.token, body: { servicio_id: servicioId } });
    assert.equal(sinFecha.status, 400);
  });
});
