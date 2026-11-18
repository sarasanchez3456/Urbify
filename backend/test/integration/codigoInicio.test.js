// Issue #57: código de inicio del servicio. El cliente ve un código de 6 dígitos en su solicitud aceptada y el
// proveedor lo necesita para pasar a `en_proceso`. Se prueba contra la API real y MySQL: quién puede verlo, que el
// código no se guarda ni se filtra, fuerza bruta (5 fallos y se bloquea, también con intentos simultáneos), código de
// otra solicitud, renovación y que todo pasa dentro de la transición atómica.
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, crearServicio, fechaColombia, solicitudEn, codigoInicioDe, iniciarEntorno, contar } = require('./helpers');

test('código de inicio del servicio (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const proveedor = await registrar('proveedor');
  const cliente = await registrar('cliente');
  const otroCliente = await registrar('cliente');
  const servicioId = await crearServicio(proveedor);
  let hora = 7;
  const nueva = (estado = 'aceptada') => solicitudEn(estado, { cliente, proveedor, servicioId, fecha: fechaColombia(30 + (hora++ % 40), '10:00') });

  const verCodigo = (id, token = cliente.token) => api('GET', `/solicitudes/${id}/codigo-inicio`, { token });
  const renovar = (id, token = cliente.token) => api('POST', `/solicitudes/${id}/codigo-inicio`, { token });
  const iniciar = (id, codigo) => api('PUT', `/solicitudes/${id}/estado`, { token: proveedor.token, body: codigo === undefined ? { estado: 'en_proceso' } : { estado: 'en_proceso', codigo } });
  const fila = async (id) => (await pool.execute('SELECT estado, codigo_inicio_sal, codigo_inicio_intentos FROM solicitudes WHERE id = ?', [id]))[0][0];
  const otroCodigo = (codigo) => String((Number(codigo) + 1) % 1000000).padStart(6, '0');

  await t.test('al aceptar, el cliente ve un código de 6 dígitos que no se guarda en claro', async () => {
    const id = await nueva();
    const r = await verCodigo(id);
    assert.equal(r.status, 200);
    assert.match(r.body.codigo, /^\d{6}$/);
    assert.equal(r.body.intentos_restantes, 5);
    assert.equal(r.body.bloqueado, false);
    assert.equal(r.body.obligatorio, true);
    // Siempre el mismo código para la misma solicitud (se puede volver a mostrar).
    assert.equal((await verCodigo(id)).body.codigo, r.body.codigo);
    // En la base solo está la sal (32 hex), nunca el código.
    const f = await fila(id);
    assert.match(f.codigo_inicio_sal, /^[0-9a-f]{32}$/);
    assert.equal(f.codigo_inicio_sal.includes(r.body.codigo), false);
  });

  await t.test('los listados de cliente y proveedor no incluyen la sal ni los intentos', async () => {
    const id = await nueva();
    for (const [ruta, token] of [['/solicitudes/cliente', cliente.token], ['/solicitudes/proveedor', proveedor.token]]) {
      const lista = (await api('GET', ruta, { token })).body;
      const s = lista.find((x) => x.id === id);
      assert.ok(s, ruta);
      assert.equal('codigo_inicio_sal' in s, false, ruta);
      assert.equal('codigo_inicio_intentos' in s, false, ruta);
    }
  });

  await t.test('solo el cliente de la solicitud, en modo cliente y con la solicitud aceptada, puede verlo', async () => {
    const id = await nueva();
    assert.equal((await verCodigo(id, proveedor.token)).status, 403, 'el proveedor nunca lo consulta');
    assert.equal((await verCodigo(id, otroCliente.token)).status, 403, 'otro cliente');
    assert.equal((await renovar(id, otroCliente.token)).status, 403, 'otro cliente no lo renueva');
    assert.equal((await verCodigo(999999)).status, 404);

    const pendiente = await nueva('pendiente');
    assert.equal((await verCodigo(pendiente)).status, 409, 'todavía no aceptada');
    const enProceso = await nueva('en_proceso');
    assert.equal((await verCodigo(enProceso)).status, 409, 'ya iniciada: el código deja de existir');
    assert.equal((await renovar(enProceso)).status, 409);
  });

  await t.test('sin código o con uno incorrecto no se inicia; con el correcto sí, y queda en el historial', async () => {
    const id = await nueva();
    const { codigo } = (await verCodigo(id)).body;

    const sin = await iniciar(id);
    assert.equal(sin.status, 400);
    assert.equal(sin.body.codigo, 'codigo_inicio_requerido');
    assert.equal((await fila(id)).codigo_inicio_intentos, 0, 'no escribir código no cuenta como intento');

    const mal = await iniciar(id, otroCodigo(codigo));
    assert.equal(mal.status, 400);
    assert.equal(mal.body.codigo, 'codigo_inicio_incorrecto');
    assert.equal(mal.body.intentos_restantes, 4);
    assert.equal((await fila(id)).estado, 'aceptada');
    assert.equal((await verCodigo(id)).body.intentos_restantes, 4);

    // Formatos que no son 6 dígitos cuentan como incorrectos (y no rompen nada).
    assert.equal((await iniciar(id, '12345')).body.codigo, 'codigo_inicio_incorrecto');

    // Se acepta con espacios o guiones.
    const ok = await iniciar(id, `${codigo.slice(0, 3)} ${codigo.slice(3)}`);
    assert.equal(ok.status, 200);
    assert.equal((await fila(id)).estado, 'en_proceso');
    const h = (await api('GET', `/solicitudes/${id}/historial`, { token: cliente.token })).body;
    assert.deepEqual(h.map((x) => x.estado_nuevo), ['pendiente', 'aceptada', 'en_proceso']);
  });

  await t.test('el código de una solicitud no sirve para otra', async () => {
    const a = await nueva();
    const b = await nueva();
    const codigoA = await codigoInicioDe(cliente, a);
    const codigoB = await codigoInicioDe(cliente, b);
    if (codigoA === codigoB) return; // coincidencia de 1 en un millón: nada que comprobar
    assert.equal((await iniciar(b, codigoA)).status, 400);
    assert.equal((await fila(b)).estado, 'aceptada');
  });

  await t.test('5 fallos bloquean el código (ni el correcto sirve), se avisa al cliente y puede generar uno nuevo', async () => {
    const id = await nueva();
    const { codigo } = (await verCodigo(id)).body;
    for (let i = 4; i >= 1; i -= 1) {
      assert.equal((await iniciar(id, otroCodigo(codigo))).body.intentos_restantes, i);
    }
    const quinto = await iniciar(id, otroCodigo(codigo));
    assert.equal(quinto.body.codigo, 'codigo_inicio_bloqueado');
    const correctoBloqueado = await iniciar(id, codigo);
    assert.equal(correctoBloqueado.status, 400);
    assert.equal(correctoBloqueado.body.codigo, 'codigo_inicio_bloqueado');
    assert.equal((await fila(id)).estado, 'aceptada');
    assert.equal((await fila(id)).codigo_inicio_intentos, 5, 'los intentos sobre un código bloqueado no siguen sumando');
    assert.equal((await verCodigo(id)).body.bloqueado, true);
    assert.equal(await contar(pool, "SELECT COUNT(*) AS n FROM notificaciones WHERE solicitud_id = ? AND usuario_id = ? AND modo = 'cliente' AND mensaje LIKE '%bloqueó el código%'", [id, cliente.id]), 1, 'un solo aviso al bloquearse');

    const r = await renovar(id);
    assert.equal(r.status, 200);
    assert.equal(r.body.bloqueado, false);
    assert.equal(r.body.intentos_restantes, 5);
    assert.equal((await verCodigo(id)).body.codigo, r.body.codigo);
    if (r.body.codigo !== codigo) {
      assert.equal((await iniciar(id, codigo)).body.codigo, 'codigo_inicio_incorrecto', 'el código anterior deja de servir');
    }
    assert.equal((await iniciar(id, r.body.codigo)).status, 200);
  });

  await t.test('intentos simultáneos: cada fallo cuenta y nunca pasan de 5 (no se puede probar en paralelo)', async () => {
    const id = await nueva();
    const { codigo } = (await verCodigo(id)).body;
    const intentos = Array.from({ length: 12 }, (_, i) => String((Number(codigo) + 1 + i) % 1000000).padStart(6, '0'));
    const respuestas = await Promise.all(intentos.map((c) => iniciar(id, c)));
    assert.ok(respuestas.every((x) => x.status === 400), 'ningún código incorrecto inicia el servicio');
    assert.equal(respuestas.filter((x) => x.body.codigo === 'codigo_inicio_incorrecto').length, 4);
    assert.equal((await fila(id)).codigo_inicio_intentos, 5);
    assert.equal((await fila(id)).estado, 'aceptada');
  });

  await t.test('una solicitud aceptada antes de existir el código recibe uno al pedirlo', async () => {
    const id = await nueva();
    await pool.execute('UPDATE solicitudes SET codigo_inicio_sal = NULL WHERE id = ?', [id]);
    assert.equal((await iniciar(id, '000000')).status, 400, 'sin sal no hay código válido');
    const [a, b] = await Promise.all([verCodigo(id), verCodigo(id)]);
    assert.equal(a.status, 200);
    assert.equal(a.body.codigo, b.body.codigo, 'dos pestañas a la vez ven el mismo código');
    assert.equal((await iniciar(id, a.body.codigo)).status, 200);
  });
});
