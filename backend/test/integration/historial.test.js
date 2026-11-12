// Issue #38: el cambio de estado y su registro en solicitud_historial son atómicos.
// El fallo del historial se simula con un trigger de MySQL (no con mocks), así se prueba el ROLLBACK real.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, volverAdmin, crearServicio, fechaColombia, solicitar, solicitudEn, iniciarEntorno, hacerFallar, contar } = require('./helpers');

test('historial y cambio de estado atómicos (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const proveedor = await registrar('proveedor');
  const cliente = await registrar('cliente');
  const servicioId = await crearServicio(proveedor);
  const historialDe = async (id) => (await api('GET', `/solicitudes/${id}/historial`, { token: cliente.token })).body;
  const estadoEnBase = async (id) => (await pool.execute('SELECT estado FROM solicitudes WHERE id = ?', [id]))[0][0].estado;
  const filasHistorial = (id) => contar(pool, 'SELECT COUNT(*) AS n FROM solicitud_historial WHERE solicitud_id = ?', [id]);

  await t.test('crear la solicitud registra exactamente una fila de historial (null -> pendiente)', async () => {
    const id = await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia(20, '09:00') });
    const h = await historialDe(id);
    assert.equal(h.length, 1);
    assert.equal(h[0].estado_anterior, null);
    assert.equal(h[0].estado_nuevo, 'pendiente');
  });

  await t.test('cada transición válida agrega una sola fila, sin duplicados', async () => {
    const id = await solicitudEn('completada', { cliente, proveedor, servicioId, fecha: fechaColombia(20, '11:00') });
    const h = await historialDe(id);
    assert.deepEqual(h.map((f) => `${f.estado_anterior}>${f.estado_nuevo}`), ['null>pendiente', 'pendiente>aceptada', 'aceptada>en_proceso', 'en_proceso>completada']);
    assert.equal(await filasHistorial(id), 4);
  });

  await t.test('si falla el historial, el estado NO cambia (rollback) y luego se puede reintentar', async () => {
    const id = await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia(20, '13:00') });
    const quitar = await hacerFallar(pool, 'solicitud_historial', "NEW.estado_nuevo = 'aceptada'");
    try {
      const r = await api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'aceptada' } });
      assert.equal(r.status, 500);
      assert.equal(await estadoEnBase(id), 'pendiente', 'la solicitud quedó con el estado nuevo aunque el historial falló');
      assert.equal(await filasHistorial(id), 1, 'no debe haber fila nueva en el historial');
    } finally {
      await quitar();
    }
    const reintento = await api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'aceptada' } });
    assert.equal(reintento.status, 200);
    assert.equal(await estadoEnBase(id), 'aceptada');
    assert.equal(await filasHistorial(id), 2);
  });

  await t.test('si falla el historial al crear, la solicitud tampoco se crea', async () => {
    const antes = await contar(pool, 'SELECT COUNT(*) AS n FROM solicitudes');
    const quitar = await hacerFallar(pool, 'solicitud_historial', "NEW.estado_nuevo = 'pendiente'");
    try {
      const r = await solicitar(cliente, servicioId, fechaColombia(21, '09:00'));
      assert.equal(r.status, 500);
      assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM solicitudes'), antes);
    } finally {
      await quitar();
    }
    // Y la hora no quedó bloqueada: el mismo horario se puede reservar después.
    const ok = await solicitar(cliente, servicioId, fechaColombia(21, '09:00'));
    assert.equal(ok.status, 201);
  });

  await t.test('si falla el historial al cancelar, se conserva también el pedido de cambio de fecha pendiente', async () => {
    const id = await solicitudEn('aceptada', { cliente, proveedor, servicioId, fecha: fechaColombia(22, '09:00') });
    const p = await api('POST', `/solicitudes/${id}/reprogramaciones`, { token: cliente.token, body: { fecha_propuesta: fechaColombia(23, '09:00') } });
    assert.equal(p.status, 201);
    const quitar = await hacerFallar(pool, 'solicitud_historial', "NEW.estado_nuevo = 'cancelada'");
    try {
      const r = await api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'cancelada' } });
      assert.equal(r.status, 500);
      assert.equal(await estadoEnBase(id), 'aceptada');
      assert.equal(await contar(pool, "SELECT COUNT(*) AS n FROM reprogramaciones WHERE solicitud_id = ? AND estado = 'pendiente'", [id]), 1);
    } finally {
      await quitar();
    }
  });

  await t.test('las transiciones inválidas siguen rechazadas y no escriben historial', async () => {
    const id = await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia(24, '09:00') });
    const saltar = await api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'completada' } });
    assert.equal(saltar.status, 400);
    const clienteAcepta = await api('PUT', `/solicitudes/${id}/estado`, { token: cliente.token, body: { estado: 'aceptada' } });
    assert.equal(clienteAcepta.status, 403);
    const invalido = await api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'inventado' } });
    assert.equal(invalido.status, 400);
    assert.equal(await filasHistorial(id), 1);
  });

  await t.test('dos cambios de estado simultáneos: uno se aplica (200) y el otro recibe 409; una sola fila nueva', async () => {
    const id = await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia(25, '09:00') });
    const [a, b] = await Promise.all([
      api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'aceptada' } }),
      api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'cancelada' } }),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    assert.equal(await filasHistorial(id), 2, 'debe haber la creación y un único cambio');
    const final = await estadoEnBase(id);
    assert.ok(['aceptada', 'cancelada'].includes(final));
  });

  await t.test('cancelación del administrador: estado, historial y auditoría juntos; si falla la auditoría, nada cambia', async () => {
    const admin = await volverAdmin(pool, await registrar('cliente'));
    const id = await solicitudEn('aceptada', { cliente, proveedor, servicioId, fecha: fechaColombia(26, '09:00') });
    const quitar = await hacerFallar(pool, 'auditoria');
    try {
      const r = await api('PUT', `/admin/solicitudes/${id}/cancelar`, { token: admin.token, body: { motivo: 'Motivo de prueba suficientemente largo' } });
      assert.equal(r.status, 500);
      assert.equal(await estadoEnBase(id), 'aceptada');
      assert.equal(await filasHistorial(id), 2);
    } finally {
      await quitar();
    }
    const ok = await api('PUT', `/admin/solicitudes/${id}/cancelar`, { token: admin.token, body: { motivo: 'Motivo de prueba suficientemente largo' } });
    assert.equal(ok.status, 200);
    assert.equal(await estadoEnBase(id), 'cancelada');
    assert.equal(await filasHistorial(id), 3);
    assert.equal(await contar(pool, "SELECT COUNT(*) AS n FROM auditoria WHERE tipo = 'solicitud'"), 1);
  });
});
