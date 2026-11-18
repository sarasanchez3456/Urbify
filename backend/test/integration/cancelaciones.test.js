// Cancelar una cita aceptada y cancelación automática cuando pasa la hora de la cita (API real + MySQL).
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, crearServicio, fechaColombia, solicitudEn, iniciarEntorno, contar } = require('./helpers');

test('cancelaciones de citas (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const proveedor = await registrar('proveedor');
  const cliente = await registrar('cliente');
  const servicioId = await crearServicio(proveedor);
  const nueva = (estado, dias, hora) => solicitudEn(estado, { cliente, proveedor, servicioId, fecha: fechaColombia(dias, hora) });
  const estadoEnBase = async (id) => (await pool.execute('SELECT estado FROM solicitudes WHERE id = ?', [id]))[0][0].estado;
  const moverCita = (id, horasDesdeAhora) => pool.execute(
    'UPDATE solicitudes SET fecha_servicio = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE) WHERE id = ?', [Math.round(horasDesdeAhora * 60), id]
  );
  const cancelar = (id, quien) => api('PUT', `/solicitudes/${id}/estado`, { token: quien.token, body: { estado: 'cancelada' } });

  await t.test('el cliente cancela una cita aceptada si faltan 2 horas o más', async () => {
    const id = await nueva('aceptada', 20, '09:00');
    const r = await cancelar(id, cliente);
    assert.equal(r.status, 200);
    assert.equal(await estadoEnBase(id), 'cancelada');
  });

  await t.test('el cliente NO cancela una cita aceptada que empieza en menos de 2 horas', async () => {
    const id = await nueva('aceptada', 20, '11:00');
    await moverCita(id, 1);
    const r = await cancelar(id, cliente);
    assert.equal(r.status, 400);
    assert.equal(r.body.codigo, 'cancelacion_tardia');
    assert.equal(await estadoEnBase(id), 'aceptada');
  });

  await t.test('el cliente no cancela una cita en proceso', async () => {
    const id = await nueva('en_proceso', 20, '13:00');
    const r = await cancelar(id, cliente);
    assert.equal(r.status, 400);
    assert.equal(await estadoEnBase(id), 'en_proceso');
  });

  await t.test('el proveedor cancela una cita aceptada y el cliente recibe el aviso', async () => {
    const id = await nueva('aceptada', 21, '09:00');
    const r = await cancelar(id, proveedor);
    assert.equal(r.status, 200);
    assert.equal(await estadoEnBase(id), 'cancelada');
    assert.equal(await contar(pool, "SELECT COUNT(*) AS n FROM notificaciones WHERE solicitud_id = ? AND usuario_id = ? AND mensaje LIKE '%canceló%'", [id, cliente.id]), 1);
  });

  await t.test('una cita aceptada que pasó su hora (y la tolerancia) se cancela sola, con historial, avisos y reporte', async () => {
    const id = await nueva('aceptada', 22, '09:00');
    await moverCita(id, -2);
    // Cualquier cambio de estado dispara la revisión: el proveedor ya no puede iniciar una cita vencida.
    const r = await api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: { estado: 'en_proceso', codigo: '000000' } });
    assert.equal(r.status, 400);
    assert.equal(await estadoEnBase(id), 'cancelada');
    const h = (await api('GET', `/solicitudes/${id}/historial`, { token: cliente.token })).body;
    assert.equal(h.at(-1).estado_nuevo, 'cancelada');
    assert.equal(await contar(pool, "SELECT COUNT(*) AS n FROM notificaciones WHERE solicitud_id = ? AND mensaje LIKE '%se canceló sola%'", [id]), 2);
    assert.equal(await contar(pool, "SELECT COUNT(*) AS n FROM auditoria WHERE accion = 'Cancelación automática' AND objeto = ?", [`Solicitud N.º ${id}`]), 1);
  });

  await t.test('una solicitud pendiente que nadie aceptó antes de la hora se cancela sola al consultar', async () => {
    const id = await nueva('pendiente', 23, '09:00');
    await moverCita(id, -2);
    await api('PUT', `/solicitudes/${await nueva('pendiente', 24, '09:00')}/estado`, { token: proveedor.token, body: { estado: 'aceptada' } });
    assert.equal(await estadoEnBase(id), 'cancelada');
  });

  await t.test('dentro de la tolerancia (10 minutos pasada la hora) todavía no se cancela', async () => {
    const id = await nueva('aceptada', 25, '09:00');
    await moverCita(id, -10 / 60);
    await api('PUT', `/solicitudes/${await nueva('pendiente', 26, '09:00')}/estado`, { token: proveedor.token, body: { estado: 'aceptada' } });
    assert.equal(await estadoEnBase(id), 'aceptada');
  });

  await t.test('una cita en proceso o completada nunca se cancela sola', async () => {
    const enProceso = await nueva('en_proceso', 27, '09:00');
    const completada = await nueva('completada', 28, '09:00');
    await moverCita(enProceso, -5);
    await moverCita(completada, -5);
    await api('PUT', `/solicitudes/${await nueva('pendiente', 29, '09:00')}/estado`, { token: proveedor.token, body: { estado: 'aceptada' } });
    assert.equal(await estadoEnBase(enProceso), 'en_proceso');
    assert.equal(await estadoEnBase(completada), 'completada');
  });

  await t.test('al cambiar la dirección sin coordenadas nuevas se borran las viejas; con coordenadas nuevas se guardan', async () => {
    const leer = async () => (await pool.execute('SELECT latitud, longitud, direccion FROM usuarios WHERE id = ?', [proveedor.id]))[0][0];
    let r = await api('PUT', '/auth/perfil', { token: proveedor.token, body: { direccion: 'Calle 52A #56-42, Medellín', latitud: 6.2442, longitud: -75.5733 } });
    assert.equal(r.status, 200);
    assert.equal(Number((await leer()).latitud).toFixed(4), '6.2442');
    // Mismo texto sin coordenadas: se conservan.
    r = await api('PUT', '/auth/perfil', { token: proveedor.token, body: { direccion: 'Calle 52A #56-42, Medellín' } });
    assert.equal(Number((await leer()).latitud).toFixed(4), '6.2442');
    // Dirección distinta sin coordenadas: se borran.
    r = await api('PUT', '/auth/perfil', { token: proveedor.token, body: { direccion: 'Carrera 10 #20-30, Cali' } });
    assert.equal(r.status, 200);
    assert.equal((await leer()).latitud, null);
  });
});
