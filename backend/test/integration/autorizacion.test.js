// Issue #37 (autorización): cada usuario solo toca lo suyo y las rutas de administración rechazan a quien no es admin.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, crearServicio, fechaColombia, solicitudEn, iniciarEntorno, contar } = require('./helpers');

test('autorización entre usuarios y rutas de administración (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const proveedor = await registrar('proveedor');
  const cliente = await registrar('cliente');
  const ajenoCliente = await registrar('cliente');
  const ajenoProveedor = await registrar('proveedor');
  const servicioId = await crearServicio(proveedor);
  const solicitudId = await solicitudEn('aceptada', { cliente, proveedor, servicioId, fecha: fechaColombia(100, '10:00') });

  await t.test('un usuario ajeno no puede consultar la solicitud (chat, historial ni cambios de fecha)', async () => {
    for (const ajeno of [ajenoCliente, ajenoProveedor]) {
      assert.equal((await api('GET', `/solicitudes/${solicitudId}/mensajes`, { token: ajeno.token })).status, 403, 'leer chat');
      assert.equal((await api('POST', `/solicitudes/${solicitudId}/mensajes`, { token: ajeno.token, body: { contenido: 'intruso' } })).status, 403, 'escribir en el chat');
      assert.equal((await api('GET', `/solicitudes/${solicitudId}/historial`, { token: ajeno.token })).status, 403, 'historial');
      assert.equal((await api('GET', `/solicitudes/${solicitudId}/reprogramaciones`, { token: ajeno.token })).status, 403, 'reprogramaciones');
    }
    assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM mensajes_solicitud WHERE solicitud_id = ?', [solicitudId]), 0);
    // Y su propia lista no incluye solicitudes de otros.
    const lista = (await api('GET', '/solicitudes/cliente', { token: ajenoCliente.token })).body;
    assert.deepEqual(lista, []);
  });

  await t.test('una solicitud inexistente da 404', async () => {
    assert.equal((await api('GET', '/solicitudes/999999/mensajes', { token: cliente.token })).status, 404);
    assert.equal((await api('PUT', '/solicitudes/999999/estado', { token: proveedor.token, body: { estado: 'aceptada' } })).status, 404);
  });

  await t.test('un proveedor no puede modificar solicitudes de otro proveedor', async () => {
    const pendiente = await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia(101, '10:00') });
    const r = await api('PUT', `/solicitudes/${pendiente}/estado`, { token: ajenoProveedor.token, body: { estado: 'aceptada' } });
    assert.equal(r.status, 403);
    assert.equal((await pool.execute('SELECT estado FROM solicitudes WHERE id = ?', [pendiente]))[0][0].estado, 'pendiente');
    assert.equal((await api('DELETE', `/solicitudes/${pendiente}`, { token: ajenoProveedor.token })).status, 403);
    assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM solicitudes WHERE id = ?', [pendiente]), 1);
  });

  await t.test('un cliente no puede modificar solicitudes de otro cliente, y el propio cliente solo puede cancelar', async () => {
    const pendiente = await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia(102, '10:00') });
    assert.equal((await api('PUT', `/solicitudes/${pendiente}/estado`, { token: ajenoCliente.token, body: { estado: 'cancelada' } })).status, 403);
    assert.equal((await api('PUT', `/solicitudes/${pendiente}/estado`, { token: cliente.token, body: { estado: 'aceptada' } })).status, 403);
    assert.equal((await api('POST', `/solicitudes/${pendiente}/reprogramaciones`, { token: ajenoCliente.token, body: { fecha_propuesta: fechaColombia(103, '10:00') } })).status, 403);
    assert.equal((await pool.execute('SELECT estado FROM solicitudes WHERE id = ?', [pendiente]))[0][0].estado, 'pendiente');
    assert.equal((await api('PUT', `/solicitudes/${pendiente}/estado`, { token: cliente.token, body: { estado: 'cancelada' } })).status, 200);
  });

  await t.test('un cliente ajeno no puede calificar la solicitud de otro', async () => {
    const completada = await solicitudEn('completada', { cliente, proveedor, servicioId, fecha: fechaColombia(104, '10:00') });
    const r = await api('POST', '/calificaciones', { token: ajenoCliente.token, body: { solicitud_id: completada, puntuacion: 5 } });
    assert.equal(r.status, 403);
    assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM calificaciones WHERE solicitud_id = ?', [completada]), 0);
  });

  await t.test('un proveedor solo modifica sus propios servicios y un cliente no puede crear servicios', async () => {
    assert.equal((await api('PUT', `/servicios/${servicioId}`, { token: ajenoProveedor.token, body: { titulo: 'Robado' } })).status, 403);
    assert.equal((await api('DELETE', `/servicios/${servicioId}`, { token: ajenoProveedor.token })).status, 403);
    assert.equal((await api('POST', '/servicios', { token: cliente.token, body: { categoria_id: 1, titulo: 'No debería', tarifa: 1000 } })).status, 403);
    assert.notEqual((await pool.execute('SELECT titulo FROM servicios WHERE id = ?', [servicioId]))[0][0].titulo, 'Robado');
  });

  await t.test('las rutas de administración rechazan sin sesión (401) y a clientes y proveedores (403)', async () => {
    const rutas = [
      ['GET', '/admin/resumen'], ['GET', `/admin/usuarios/${cliente.id}`], ['PUT', `/admin/usuarios/${cliente.id}/estado`],
      ['GET', '/admin/servicios'], ['PUT', `/admin/servicios/${servicioId}/disponible`], ['GET', '/admin/solicitudes'],
      ['PUT', `/admin/solicitudes/${solicitudId}/cancelar`], ['GET', '/admin/resenas'], ['GET', '/admin/reportes'],
      ['GET', '/admin/auditoria'], ['POST', '/categorias'], ['GET', '/auth'],
    ];
    for (const [metodo, ruta] of rutas) {
      const cuerpo = { motivo: 'Motivo de prueba suficientemente largo', activo: false, disponible: false, nombre: 'X' };
      assert.equal((await api(metodo, ruta, { body: metodo === 'GET' ? undefined : cuerpo })).status, 401, `${metodo} ${ruta} sin sesión`);
      for (const u of [cliente, proveedor]) {
        const r = await api(metodo, ruta, { token: u.token, body: metodo === 'GET' ? undefined : cuerpo });
        assert.equal(r.status, 403, `${metodo} ${ruta} como ${u.rol}`);
      }
    }
    // Nada cambió por esos intentos.
    assert.equal((await pool.execute('SELECT activo FROM usuarios WHERE id = ?', [cliente.id]))[0][0].activo, 1);
    assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM auditoria'), 0);
  });

  await t.test('un token cerrado (logout) deja de funcionar', async () => {
    const temporal = await registrar('cliente');
    assert.equal((await api('GET', '/auth/perfil', { token: temporal.token })).status, 200);
    assert.equal((await api('POST', '/auth/logout', { token: temporal.token })).status, 200);
    assert.equal((await api('GET', '/auth/perfil', { token: temporal.token })).status, 401);
  });
});
