// Issue #39: cada acción administrativa y su registro de auditoría forman una sola transacción.
// El fallo de la auditoría se simula con un trigger de MySQL, así se prueba el ROLLBACK real de cada acción.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, volverAdmin, crearServicio, fechaColombia, solicitudEn, iniciarEntorno, hacerFallar, contar } = require('./helpers');

const MOTIVO = 'Motivo de prueba suficientemente largo';

test('auditoría administrativa atómica (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const admin = await volverAdmin(pool, await registrar('cliente'));
  const proveedor = await registrar('proveedor');
  const cliente = await registrar('cliente');
  const servicioId = await crearServicio(proveedor);
  const auditorias = (where = '1 = 1', params = []) => contar(pool, `SELECT COUNT(*) AS n FROM auditoria WHERE ${where}`, params);
  const fila = async (sql, params) => (await pool.execute(sql, params))[0][0];

  // Intenta una acción con la auditoría rota; comprueba que falla (500) y devuelve a `comprobar` para verificar que no cambió nada.
  const conAuditoriaRota = async (peticion, comprobar) => {
    const antes = await auditorias();
    const quitar = await hacerFallar(pool, 'auditoria');
    try {
      const r = await peticion();
      assert.equal(r.status, 500, `se esperaba 500 con la auditoría rota y fue ${r.status}`);
      await comprobar();
      assert.equal(await auditorias(), antes, 'no debe quedar auditoría parcial');
    } finally {
      await quitar();
    }
  };

  await t.test('suspender un usuario: cuenta, sesiones y auditoría quedan juntas', async () => {
    const u = await registrar('cliente');
    const r = await api('PUT', `/admin/usuarios/${u.id}/estado`, { token: admin.token, body: { activo: false, motivo: MOTIVO } });
    assert.equal(r.status, 200);
    assert.equal((await fila('SELECT activo FROM usuarios WHERE id = ?', [u.id])).activo, 0);
    assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM tokens_sesion WHERE usuario_id = ?', [u.id]), 0);
    const a = await fila("SELECT * FROM auditoria WHERE tipo = 'usuario' ORDER BY id DESC LIMIT 1", []);
    assert.equal(a.admin_id, admin.id);
    assert.equal(a.accion, 'Suspendió a');
    assert.equal(a.motivo, MOTIVO);
    const re = await api('PUT', `/admin/usuarios/${u.id}/estado`, { token: admin.token, body: { activo: true, motivo: MOTIVO } });
    assert.equal(re.status, 200);
    assert.equal((await fila('SELECT activo FROM usuarios WHERE id = ?', [u.id])).activo, 1);
  });

  await t.test('suspender con la auditoría rota: la cuenta sigue activa y conserva sus sesiones', async () => {
    const u = await registrar('cliente');
    await conAuditoriaRota(
      () => api('PUT', `/admin/usuarios/${u.id}/estado`, { token: admin.token, body: { activo: false, motivo: MOTIVO } }),
      async () => {
        assert.equal((await fila('SELECT activo FROM usuarios WHERE id = ?', [u.id])).activo, 1);
        assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM tokens_sesion WHERE usuario_id = ?', [u.id]), 1);
      }
    );
  });

  await t.test('el motivo sigue siendo obligatorio y las restricciones del admin se mantienen', async () => {
    const u = await registrar('cliente');
    const antes = await auditorias();
    assert.equal((await api('PUT', `/admin/usuarios/${u.id}/estado`, { token: admin.token, body: { activo: false } })).status, 400);
    assert.equal((await api('PUT', `/admin/usuarios/${u.id}/estado`, { token: admin.token, body: { activo: false, motivo: 'corto' } })).status, 400);
    assert.equal((await api('PUT', `/admin/usuarios/${admin.id}/estado`, { token: admin.token, body: { activo: false, motivo: MOTIVO } })).status, 400, 'no puede suspender su propia cuenta');
    const otroAdmin = await volverAdmin(pool, await registrar('cliente'));
    assert.equal((await api('PUT', `/admin/usuarios/${otroAdmin.id}/estado`, { token: admin.token, body: { activo: false, motivo: MOTIVO } })).status, 403, 'no puede suspender a otro admin');
    assert.equal((await fila('SELECT activo FROM usuarios WHERE id = ?', [u.id])).activo, 1);
    assert.equal(await auditorias(), antes);
  });

  await t.test('ocultar un servicio: cambio + auditoría juntos; con la auditoría rota no cambia', async () => {
    await conAuditoriaRota(
      () => api('PUT', `/admin/servicios/${servicioId}/disponible`, { token: admin.token, body: { disponible: false, motivo: MOTIVO } }),
      async () => assert.equal((await fila('SELECT disponible FROM servicios WHERE id = ?', [servicioId])).disponible, 1)
    );
    const ok = await api('PUT', `/admin/servicios/${servicioId}/disponible`, { token: admin.token, body: { disponible: false, motivo: MOTIVO } });
    assert.equal(ok.status, 200);
    assert.equal((await fila('SELECT disponible FROM servicios WHERE id = ?', [servicioId])).disponible, 0);
    assert.equal(await auditorias("tipo = 'servicio'"), 1);
    await api('PUT', `/admin/servicios/${servicioId}/disponible`, { token: admin.token, body: { disponible: true, motivo: MOTIVO } });
  });

  await t.test('cancelar una solicitud: cambio + historial + auditoría juntos (ver historial.test.js); registra la acción', async () => {
    const id = await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia(30, '09:00') });
    await conAuditoriaRota(
      () => api('PUT', `/admin/solicitudes/${id}/cancelar`, { token: admin.token, body: { motivo: MOTIVO } }),
      async () => assert.equal((await fila('SELECT estado FROM solicitudes WHERE id = ?', [id])).estado, 'pendiente')
    );
    const ok = await api('PUT', `/admin/solicitudes/${id}/cancelar`, { token: admin.token, body: { motivo: MOTIVO } });
    assert.equal(ok.status, 200);
    assert.equal((await fila('SELECT estado FROM solicitudes WHERE id = ?', [id])).estado, 'cancelada');
    assert.equal(await auditorias("tipo = 'solicitud'"), 1);
  });

  await t.test('ocultar una reseña: cambio + auditoría juntos; con la auditoría rota no cambia', async () => {
    const id = await solicitudEn('completada', { cliente, proveedor, servicioId, fecha: fechaColombia(31, '09:00') });
    const [ins] = await pool.execute('INSERT INTO calificaciones (solicitud_id, cliente_id, proveedor_id, puntuacion) VALUES (?, ?, ?, 4)', [id, cliente.id, proveedor.id]);
    await conAuditoriaRota(
      () => api('PUT', `/admin/resenas/${ins.insertId}/oculta`, { token: admin.token, body: { oculta: true, motivo: MOTIVO } }),
      async () => assert.equal((await fila('SELECT oculta FROM calificaciones WHERE id = ?', [ins.insertId])).oculta, 0)
    );
    const ok = await api('PUT', `/admin/resenas/${ins.insertId}/oculta`, { token: admin.token, body: { oculta: true, motivo: MOTIVO } });
    assert.equal(ok.status, 200);
    assert.equal((await fila('SELECT oculta FROM calificaciones WHERE id = ?', [ins.insertId])).oculta, 1);
    assert.equal(await auditorias("tipo = 'resena'"), 1);
  });

  await t.test('resolver un reporte: cambio + auditoría juntos; con la auditoría rota sigue "nuevo"', async () => {
    const id = await solicitudEn('completada', { cliente, proveedor, servicioId, fecha: fechaColombia(32, '09:00') });
    const [ins] = await pool.execute("INSERT INTO reportes (reportante_id, reportado_id, solicitud_id, motivo, detalle) VALUES (?, ?, ?, 'otro', 'Detalle de prueba del reporte')", [cliente.id, proveedor.id, id]);
    await conAuditoriaRota(
      () => api('PUT', `/admin/reportes/${ins.insertId}`, { token: admin.token, body: { estado: 'resuelto', nota: 'Se habló con el profesional y quedó aclarado' } }),
      async () => assert.equal((await fila('SELECT estado FROM reportes WHERE id = ?', [ins.insertId])).estado, 'nuevo')
    );
    const ok = await api('PUT', `/admin/reportes/${ins.insertId}`, { token: admin.token, body: { estado: 'resuelto', nota: 'Se habló con el profesional y quedó aclarado' } });
    assert.equal(ok.status, 200);
    const r = await fila('SELECT estado, atendido_por FROM reportes WHERE id = ?', [ins.insertId]);
    assert.equal(r.estado, 'resuelto');
    assert.equal(r.atendido_por, admin.id);
    assert.equal(await auditorias("tipo = 'reporte'"), 1);
  });

  await t.test('categorías: crear, editar y eliminar se auditan; con la auditoría rota no cambia nada', async () => {
    const nombre = `Categoría ${Date.now()}`;
    // Crear
    const antesCats = await contar(pool, 'SELECT COUNT(*) AS n FROM categorias');
    await conAuditoriaRota(
      () => api('POST', '/categorias', { token: admin.token, body: { nombre } }),
      async () => assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM categorias'), antesCats)
    );
    const creada = await api('POST', '/categorias', { token: admin.token, body: { nombre } });
    assert.equal(creada.status, 201);
    const catId = creada.body.id;
    // Editar
    await conAuditoriaRota(
      () => api('PUT', `/categorias/${catId}`, { token: admin.token, body: { nombre: `${nombre} editada` } }),
      async () => assert.equal((await fila('SELECT nombre FROM categorias WHERE id = ?', [catId])).nombre, nombre)
    );
    const editada = await api('PUT', `/categorias/${catId}`, { token: admin.token, body: { nombre: `${nombre} editada` } });
    assert.equal(editada.status, 200);
    assert.equal((await fila('SELECT nombre FROM categorias WHERE id = ?', [catId])).nombre, `${nombre} editada`);
    // Eliminar
    await conAuditoriaRota(
      () => api('DELETE', `/categorias/${catId}`, { token: admin.token }),
      async () => assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM categorias WHERE id = ?', [catId]), 1)
    );
    const eliminada = await api('DELETE', `/categorias/${catId}`, { token: admin.token });
    assert.equal(eliminada.status, 200);
    assert.equal(await auditorias("tipo = 'categoria'"), 3, 'crear, editar y eliminar dejan una auditoría cada uno');
  });

  await t.test('eliminar una categoría con servicios sigue dando 409 y no deja auditoría', async () => {
    const antes = await auditorias("tipo = 'categoria'");
    const r = await api('DELETE', '/categorias/1', { token: admin.token });
    assert.equal(r.status, 409);
    assert.equal(await contar(pool, 'SELECT COUNT(*) AS n FROM categorias WHERE id = 1'), 1);
    assert.equal(await auditorias("tipo = 'categoria'"), antes);
  });

  await t.test('el listado de auditoría devuelve las acciones registradas', async () => {
    const r = await api('GET', '/admin/auditoria', { token: admin.token });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body) && r.body.length >= 6);
    assert.ok(r.body.every((x) => x.tipo && x.accion && x.fecha));
  });
});
