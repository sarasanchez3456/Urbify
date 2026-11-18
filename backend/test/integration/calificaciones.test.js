// Calificaciones (issue #7): validaciones, permisos, una sola por solicitud (también con peticiones simultáneas),
// promedio público, edición, borrado y reseñas ocultas por un administrador.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, volverAdmin, crearServicio, fechaColombia, solicitudEn, iniciarEntorno } = require('./helpers');

const MOTIVO = 'Motivo de prueba suficientemente largo';

test('calificaciones (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const proveedor = await registrar('proveedor');
  const servicioId = await crearServicio(proveedor);
  const cliente = await registrar('cliente');
  const otroCliente = await registrar('cliente');
  const admin = await volverAdmin(pool, await registrar('cliente'));
  let dia = 60;
  const completada = (quien = cliente) => solicitudEn('completada', { cliente: quien, proveedor, servicioId, fecha: fechaColombia((dia += 1), '10:00') });
  const calificar = (token, cuerpo) => api('POST', '/calificaciones', { token, body: cuerpo });
  const publicas = async () => (await api('GET', `/calificaciones/proveedor/${proveedor.id}`)).body;

  await t.test('la puntuación debe ser un entero de 1 a 5 y los motivos deben corresponder a la nota', async () => {
    const id = await completada();
    for (const puntuacion of [0, 6, -1, 3.5, '5', null, undefined, 'cinco']) {
      assert.equal((await calificar(cliente.token, { solicitud_id: id, puntuacion })).status, 400, `puntuación ${JSON.stringify(puntuacion)}`);
    }
    assert.equal((await calificar(cliente.token, { puntuacion: 5 })).status, 400, 'sin solicitud_id');
    assert.equal((await calificar(cliente.token, { solicitud_id: id, puntuacion: 5, motivos: ['llego_tarde'] })).status, 400, 'motivo negativo con 5 estrellas');
    assert.equal((await calificar(cliente.token, { solicitud_id: id, puntuacion: 2, motivos: ['puntual'] })).status, 400, 'motivo positivo con 2 estrellas');
    assert.equal((await calificar(cliente.token, { solicitud_id: id, puntuacion: 5, motivos: ['puntual', 'puntual'] })).status, 400, 'motivos repetidos');
    assert.equal((await calificar(cliente.token, { solicitud_id: id, puntuacion: 5, motivos: ['inventado'] })).status, 400, 'motivo desconocido');
    assert.equal((await calificar(cliente.token, { solicitud_id: id, puntuacion: 5, motivos: ['puntual', 'trabajo_limpio', 'buen_precio', 'buena_comunicacion', 'lo_recomiendo', 'puntual'] })).status, 400, 'demasiados motivos');
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM calificaciones WHERE solicitud_id = ?', [id]);
    assert.equal(Number(n), 0, 'ninguna petición inválida dejó una calificación');
  });

  await t.test('solo el cliente de la solicitud puede calificar, y solo si está completada', async () => {
    const hecha = await completada();
    assert.equal((await calificar(cliente.token, { solicitud_id: 99999999, puntuacion: 5 })).status, 404, 'no existe');
    assert.equal((await calificar(otroCliente.token, { solicitud_id: hecha, puntuacion: 5 })).status, 403, 'otro cliente');
    assert.equal((await calificar(proveedor.token, { solicitud_id: hecha, puntuacion: 5 })).status, 403, 'el proveedor no califica el servicio');
    assert.equal((await calificar(undefined, { solicitud_id: hecha, puntuacion: 5 })).status, 401, 'sin sesión');
    const pendiente = await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia((dia += 1), '12:00') });
    const aceptada = await solicitudEn('aceptada', { cliente, proveedor, servicioId, fecha: fechaColombia((dia += 1), '14:00') });
    assert.equal((await calificar(cliente.token, { solicitud_id: pendiente, puntuacion: 5 })).status, 400);
    assert.equal((await calificar(cliente.token, { solicitud_id: aceptada, puntuacion: 5 })).status, 400);
  });

  await t.test('una solicitud solo se califica una vez, incluso con dos peticiones a la vez', async () => {
    const id = await completada();
    assert.equal((await calificar(cliente.token, { solicitud_id: id, puntuacion: 4, motivos: ['puntual'] })).status, 201);
    assert.equal((await calificar(cliente.token, { solicitud_id: id, puntuacion: 5 })).status, 409);

    const otra = await completada();
    const [a, b] = await Promise.all([calificar(cliente.token, { solicitud_id: otra, puntuacion: 5 }), calificar(cliente.token, { solicitud_id: otra, puntuacion: 1 })]);
    assert.deepEqual([a.status, b.status].sort(), [201, 409]);
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM calificaciones WHERE solicitud_id = ?', [otra]);
    assert.equal(Number(n), 1);
  });

  await t.test('el promedio y la lista pública cuentan lo correcto y no exponen datos de contacto del cliente', async () => {
    await pool.query('DELETE FROM calificaciones WHERE proveedor_id = ?', [proveedor.id]);
    const uno = await completada();
    const dos = await completada(otroCliente);
    assert.equal((await calificar(cliente.token, { solicitud_id: uno, puntuacion: 5, comentario: 'Excelente trabajo', motivos: ['puntual', 'lo_recomiendo'] })).status, 201);
    assert.equal((await calificar(otroCliente.token, { solicitud_id: dos, puntuacion: 3, comentario: 'Regular', motivos: ['llego_tarde'] })).status, 201);

    const r = await publicas(); // sin sesión
    assert.equal(Number(r.total), 2);
    assert.equal(Number(r.promedio), 4);
    assert.equal(r.calificaciones.length, 2);
    const conMotivos = r.calificaciones.find((c) => c.puntuacion === 5);
    assert.deepEqual(conMotivos.motivos, ['puntual', 'lo_recomiendo']);
    for (const c of r.calificaciones) {
      assert.equal('correo' in c, false);
      assert.equal('telefono' in c, false);
      assert.equal('cliente_id' in c, false);
    }
  });

  await t.test('editar y borrar: solo el autor; cambiar de nota positiva a negativa borra los motivos; el promedio se actualiza', async () => {
    await pool.query('DELETE FROM calificaciones WHERE proveedor_id = ?', [proveedor.id]);
    const id = await completada();
    const creada = await calificar(cliente.token, { solicitud_id: id, puntuacion: 5, motivos: ['puntual'] });
    const calId = creada.body.calificacion.id;

    assert.equal((await api('PUT', `/calificaciones/${calId}`, { token: otroCliente.token, body: { puntuacion: 1 } })).status, 403);
    assert.equal((await api('DELETE', `/calificaciones/${calId}`, { token: otroCliente.token })).status, 403);
    assert.equal((await api('PUT', `/calificaciones/${calId}`, { token: cliente.token, body: { puntuacion: 9 } })).status, 400);
    assert.equal((await api('PUT', '/calificaciones/99999999', { token: cliente.token, body: { puntuacion: 2 } })).status, 404);

    assert.equal((await api('PUT', `/calificaciones/${calId}`, { token: cliente.token, body: { puntuacion: 2 } })).status, 200);
    const [[fila]] = await pool.query('SELECT puntuacion, motivos FROM calificaciones WHERE id = ?', [calId]);
    assert.equal(fila.puntuacion, 2);
    assert.equal(fila.motivos, null, 'los motivos positivos ya no corresponden a una nota negativa');
    assert.equal(Number((await publicas()).promedio), 2);

    assert.equal((await api('DELETE', `/calificaciones/${calId}`, { token: cliente.token })).status, 200);
    const despues = await publicas();
    assert.equal(Number(despues.total), 0);
    assert.equal(Number(despues.promedio), 0);
  });

  await t.test('una reseña ocultada por un administrador sale de la lista pública y del promedio', async () => {
    await pool.query('DELETE FROM calificaciones WHERE proveedor_id = ?', [proveedor.id]);
    const a = await completada();
    const b = await completada(otroCliente);
    const bueno = await calificar(cliente.token, { solicitud_id: a, puntuacion: 5 });
    const malo = await calificar(otroCliente.token, { solicitud_id: b, puntuacion: 1, comentario: 'Reseña a moderar' });
    assert.equal(Number((await publicas()).promedio), 3);

    const oculta = await api('PUT', `/admin/resenas/${malo.body.calificacion.id}/oculta`, { token: admin.token, body: { oculta: true, motivo: MOTIVO } });
    assert.equal(oculta.status, 200);
    const r = await publicas();
    assert.equal(Number(r.total), 1);
    assert.equal(Number(r.promedio), 5);
    assert.ok(!r.calificaciones.some((c) => c.comentario === 'Reseña a moderar'));
    assert.equal((await api('PUT', `/admin/resenas/${bueno.body.calificacion.id}/oculta`, { token: cliente.token, body: { oculta: true, motivo: MOTIVO } })).status, 403, 'un cliente no modera');
  });

  await t.test('el proveedor califica al cliente solo de sus solicitudes completadas, una vez, y el cliente no ve esa calificación', async () => {
    const id = await completada();
    const ajena = await (async () => {
      const otroProveedor = await registrar('proveedor');
      const servicioAjeno = await crearServicio(otroProveedor);
      return { otroProveedor, id: await solicitudEn('completada', { cliente, proveedor: otroProveedor, servicioId: servicioAjeno, fecha: fechaColombia((dia += 1), '16:00') }) };
    })();
    const calificarCliente = (token, cuerpo) => api('POST', '/calificaciones/cliente', { token, body: cuerpo });

    assert.equal((await calificarCliente(proveedor.token, { solicitud_id: id, puntuacion: 0 })).status, 400);
    assert.equal((await calificarCliente(proveedor.token, { solicitud_id: id, puntuacion: 4.5 })).status, 400);
    assert.equal((await calificarCliente(proveedor.token, { solicitud_id: id, puntuacion: 5, comentario: 'x'.repeat(501) })).status, 400);
    assert.equal((await calificarCliente(proveedor.token, { solicitud_id: ajena.id, puntuacion: 5 })).status, 404, 'solicitud de otro proveedor: 404, no revela que existe');
    assert.equal((await calificarCliente(cliente.token, { solicitud_id: id, puntuacion: 5 })).status, 403, 'un cliente no puede usar esta ruta');
    assert.equal((await calificarCliente(proveedor.token, { solicitud_id: id, puntuacion: 4, comentario: 'Cliente amable' })).status, 201);
    assert.equal((await calificarCliente(proveedor.token, { solicitud_id: id, puntuacion: 5 })).status, 409);
    const pendiente = await solicitudEn('pendiente', { cliente, proveedor, servicioId, fecha: fechaColombia((dia += 1), '18:00') });
    assert.equal((await calificarCliente(proveedor.token, { solicitud_id: pendiente, puntuacion: 5 })).status, 400);
  });
});
