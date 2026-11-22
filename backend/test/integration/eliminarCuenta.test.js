// Eliminar la cuenta (cliente, proveedor y desde el panel de administración), cuentas sin verificar y modo actual en el
// panel. Se prueba contra la API real y MySQL.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, registrarSinVerificar, volverAdmin, crearServicio, fechaColombia, solicitudEn, iniciarEntorno } = require('./helpers');

const CLAVE = 'Clave-de-pruebas-1';
const MOTIVO = 'Motivo de prueba suficientemente largo';

test('eliminar cuentas, cuentas sin verificar y modo en el panel (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;
  const admin = await volverAdmin(pool, await registrar('cliente'));
  const eliminarMia = (u, contrasena = CLAVE) => api('DELETE', '/auth/perfil', { token: u.token, body: { contrasena } });
  const existe = async (id) => (await pool.execute('SELECT id FROM usuarios WHERE id = ?', [id]))[0].length === 1;
  const iniciar = (correo) => api('POST', '/auth/login', { body: { correo, contrasena: CLAVE } });

  await t.test('un cliente sin historial elimina su cuenta con su contraseña: se borra y su sesión deja de valer', async () => {
    const u = await registrar('cliente');
    const mala = await eliminarMia(u, 'otra-clave-que-no-es-1');
    assert.equal(mala.status, 400);
    assert.equal(mala.body.codigo, 'contrasena_incorrecta');
    assert.equal(await existe(u.id), true, 'con la contraseña incorrecta no se borra nada');

    assert.equal((await api('DELETE', '/auth/perfil', { token: u.token, body: {} })).status, 400, 'sin contraseña tampoco');
    assert.equal((await api('DELETE', '/auth/perfil', { body: { contrasena: CLAVE } })).status, 401, 'sin sesión no');

    const ok = await eliminarMia(u);
    assert.equal(ok.status, 200);
    assert.equal(await existe(u.id), false);
    assert.equal((await api('GET', '/auth/perfil', { token: u.token })).status, 401);
    assert.equal((await iniciar(u.correo)).status, 401);
  });

  await t.test('un proveedor con historial queda anonimizado: sus datos se borran, la otra parte conserva la solicitud', async () => {
    const proveedor = await registrar('proveedor');
    const cliente = await registrar('cliente');
    const servicioId = await crearServicio(proveedor);
    const id = await solicitudEn('completada', { cliente, proveedor, servicioId, fecha: fechaColombia(31, '10:00') });

    assert.equal((await eliminarMia(proveedor)).status, 200);
    const [[fila]] = await pool.execute('SELECT correo, telefono, direccion, activo, nombre, apellido FROM usuarios WHERE id = ?', [proveedor.id]);
    assert.match(fila.correo, /^eliminada-\d+@eliminada\.invalid$/);
    assert.equal(fila.telefono, null);
    assert.equal(fila.activo, 0);
    assert.equal(`${fila.nombre} ${fila.apellido}`, 'Cuenta eliminada');
    const [[serv]] = await pool.execute('SELECT disponible FROM servicios WHERE id = ?', [servicioId]);
    assert.equal(serv.disponible, 0, 'sus servicios dejan de mostrarse');
    assert.equal((await iniciar(proveedor.correo)).status, 401);

    const delCliente = await api('GET', '/solicitudes/cliente', { token: cliente.token });
    assert.ok(delCliente.body.some((s) => s.id === id), 'el cliente sigue viendo su solicitud terminada');

    const lista = await api('GET', '/auth/', { token: admin.token });
    assert.equal(lista.body.some((u) => u.id === proveedor.id), false, 'el panel no lista las cuentas eliminadas');
    // El correo vuelve a estar libre para registrarse otra vez.
    assert.equal((await registrarSinVerificar('cliente', { correo: proveedor.correo })).respuesta.status, 202);
  });

  await t.test('con solicitudes abiertas no se puede eliminar (ni ellos ni el administrador)', async () => {
    const proveedor = await registrar('proveedor');
    const cliente = await registrar('cliente');
    const servicioId = await crearServicio(proveedor);
    await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia(32, '10:00') });

    const propia = await eliminarMia(cliente);
    assert.equal(propia.status, 409);
    assert.equal(propia.body.codigo, 'solicitudes_abiertas');
    const comoAdmin = await api('DELETE', `/admin/usuarios/${proveedor.id}`, { token: admin.token, body: { motivo: MOTIVO } });
    assert.equal(comoAdmin.status, 409);
    assert.equal(await existe(cliente.id), true);
    assert.equal(await existe(proveedor.id), true);
  });

  await t.test('el administrador elimina cuentas con motivo y queda en la auditoría; no puede con admins ni con la suya', async () => {
    const u = await registrar('cliente');
    const sinMotivo = await api('DELETE', `/admin/usuarios/${u.id}`, { token: admin.token, body: {} });
    assert.equal(sinMotivo.status, 400);
    assert.equal((await api('DELETE', `/admin/usuarios/${u.id}`, { token: u.token, body: { motivo: MOTIVO } })).status, 403, 'un cliente no usa la ruta de admin');

    const ok = await api('DELETE', `/admin/usuarios/${u.id}`, { token: admin.token, body: { motivo: MOTIVO } });
    assert.equal(ok.status, 200);
    assert.equal(await existe(u.id), false);
    const [aud] = await pool.execute("SELECT accion FROM auditoria WHERE admin_id = ? AND accion = 'Eliminó a'", [admin.id]);
    assert.equal(aud.length, 1);

    const otroAdmin = await volverAdmin(pool, await registrar('cliente'));
    assert.equal((await api('DELETE', `/admin/usuarios/${otroAdmin.id}`, { token: admin.token, body: { motivo: MOTIVO } })).status, 403);
    assert.equal((await api('DELETE', `/admin/usuarios/${admin.id}`, { token: admin.token, body: { motivo: MOTIVO } })).status, 400);
    assert.equal((await api('DELETE', '/auth/perfil', { token: admin.token, body: { contrasena: CLAVE } })).status, 403, 'los admins solo se gestionan desde el servidor');
  });

  await t.test('quien se registró y no escribió el código no aparece como cuenta activa ni cuenta en las cifras', async () => {
    const antes = await api('GET', '/admin/resumen', { token: admin.token });
    const antesPublico = await api('GET', '/stats');
    const { correo, respuesta } = await registrarSinVerificar('proveedor');
    assert.equal(respuesta.status, 202);

    const lista = await api('GET', '/auth/', { token: admin.token });
    const fila = lista.body.find((u) => u.correo === correo);
    assert.ok(fila, 'el administrador la ve (para poder borrarla)');
    assert.ok(!fila.correo_verificado, 'pero marcada como sin verificar');
    const detalle = await api('GET', `/admin/usuarios/${fila.id}`, { token: admin.token });
    assert.ok(!detalle.body.correo_verificado);

    const despues = await api('GET', '/admin/resumen', { token: admin.token });
    assert.deepEqual(despues.body.usuarios_por_rol, antes.body.usuarios_por_rol, 'no suma a los usuarios');
    assert.deepEqual(despues.body.cuentas_por_capacidad_y_modo, antes.body.cuentas_por_capacidad_y_modo);
    const publico = await api('GET', '/stats');
    assert.equal(publico.body.proveedores_activos, antesPublico.body.proveedores_activos, 'ni a los proveedores de la página de inicio');
  });

  await t.test('el panel recibe el modo actual de un proveedor que pasa a modo cliente', async () => {
    const p = await registrar('proveedor');
    const cambio = await api('POST', '/auth/cambiar-modo', { token: p.token, body: { modo: 'cliente' } });
    assert.equal(cambio.status, 200);
    const lista = await api('GET', '/auth/', { token: admin.token });
    const fila = lista.body.find((u) => u.id === p.id);
    assert.equal(fila.rol, 'proveedor');
    assert.equal(fila.es_proveedor, true);
    assert.equal(fila.modo_activo, 'cliente');
  });
});
