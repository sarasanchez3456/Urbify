// Verificación de correo: el código llega al correo, activa la cuenta y resiste los ataques habituales
// (fuerza bruta, reutilización, códigos vencidos, enumeración de correos, registro con el correo de otra persona).
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrarSinVerificar, codigoEnviadoA, lineasDeLogs, iniciarEntorno } = require('./helpers');

const CLAVE = 'Clave-de-pruebas-1';
const FORMATO_CODIGO = /^[A-HJKMNP-Z2-9]{6}$/; // mayúsculas y dígitos 2-9; sin 0, 1, I, L, O

test('verificación de correo (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());
  const { pool } = entorno;

  const usuarioDe = async (correo) => (await pool.execute('SELECT * FROM usuarios WHERE correo = ?', [correo]))[0][0];
  const filaCodigo = async (usuarioId) => (await pool.execute('SELECT * FROM verificaciones_correo WHERE usuario_id = ?', [usuarioId]))[0][0];
  const verificar = (correo, codigo) => api('POST', '/auth/verificar-correo', { body: { correo, codigo } });
  // Registra y devuelve el código que el servidor "envió".
  const registrarYObtenerCodigo = async (rol = 'cliente', extra = {}) => {
    const desde = lineasDeLogs() - 1;
    const { correo, respuesta } = await registrarSinVerificar(rol, extra);
    assert.equal(respuesta.status, 202);
    const codigo = await codigoEnviadoA(correo, { desde });
    assert.ok(codigo, 'debe enviarse un código');
    return { correo, codigo };
  };
  const permitirReenvio = (usuarioId) => pool.execute("UPDATE verificaciones_correo SET fecha_envio = DATE_SUB(NOW(), INTERVAL 5 MINUTE) WHERE usuario_id = ?", [usuarioId]);

  await t.test('al registrarse no hay sesión: la cuenta queda sin verificar y no puede iniciar sesión', async () => {
    const { correo, codigo } = await registrarYObtenerCodigo();
    assert.match(codigo, FORMATO_CODIGO, 'el código es de 6 caracteres en MAYÚSCULAS, sin caracteres confusos');
    const u = await usuarioDe(correo);
    assert.equal(u.correo_verificado, 0);
    const login = await api('POST', '/auth/login', { body: { correo, contrasena: CLAVE } });
    assert.equal(login.status, 403);
    assert.equal(login.body.codigo, 'correo_no_verificado');
    assert.equal(login.body.token, undefined);
    const sesiones = (await pool.execute('SELECT COUNT(*) AS n FROM tokens_sesion WHERE usuario_id = ?', [u.id]))[0][0].n;
    assert.equal(Number(sesiones), 0, 'no se abrió ninguna sesión');
  });

  await t.test('la respuesta del registro no trae token ni datos de la cuenta', async () => {
    const { respuesta } = await registrarSinVerificar('cliente');
    assert.equal(respuesta.status, 202);
    assert.equal(respuesta.body.token, undefined);
    assert.equal(respuesta.body.usuario, undefined);
    assert.equal(respuesta.body.requiere_verificacion, true);
  });

  await t.test('con el código correcto se activa la cuenta, se abre la sesión y el código desaparece', async () => {
    const { correo, codigo } = await registrarYObtenerCodigo();
    const r = await verificar(correo, codigo);
    assert.equal(r.status, 200);
    assert.ok(r.body.token);
    assert.equal(r.body.usuario.correo, correo);
    assert.equal(r.body.usuario.contrasena, undefined);
    const u = await usuarioDe(correo);
    assert.equal(u.correo_verificado, 1);
    assert.equal(await filaCodigo(u.id), undefined, 'el código se borra al usarse');
    assert.equal((await api('GET', '/auth/perfil', { token: r.body.token })).status, 200);
    assert.equal((await api('POST', '/auth/login', { body: { correo, contrasena: CLAVE } })).status, 200);
    // Reutilizar el mismo código ya no sirve.
    assert.equal((await verificar(correo, codigo)).status, 400);
  });

  await t.test('el código se acepta en minúsculas, con espacios o guiones (el backend lo pasa a mayúsculas)', async () => {
    const { correo, codigo } = await registrarYObtenerCodigo();
    const escrito = `${codigo.slice(0, 3)} - ${codigo.slice(3)}`.toLowerCase();
    assert.equal((await verificar(correo, escrito)).status, 200);
  });

  await t.test('en la base solo se guarda un hash: el código en claro no aparece', async () => {
    const { correo, codigo } = await registrarYObtenerCodigo();
    const fila = await filaCodigo((await usuarioDe(correo)).id);
    assert.notEqual(fila.codigo_hash, codigo);
    assert.ok(!fila.codigo_hash.includes(codigo));
    assert.match(fila.codigo_hash, /^[0-9a-f]{64}$/);
  });

  await t.test('un código incorrecto da siempre el mismo error (también correo inexistente o código mal formado)', async () => {
    const { correo, codigo } = await registrarYObtenerCodigo();
    const otro = codigo === 'AAAAAA' ? 'BBBBBB' : 'AAAAAA';
    const respuestas = await Promise.all([
      verificar(correo, otro),
      verificar('no.existe@pruebas.test', 'AAAAAA'),
      verificar(correo, 'esto no es un codigo'),
      verificar(correo, '000000'),
    ]);
    for (const r of respuestas) {
      assert.equal(r.status, 400);
      assert.deepEqual(r.body, respuestas[0].body, 'el mensaje no debe delatar la causa');
    }
  });

  await t.test('fuerza bruta: tras 5 intentos fallidos el código se bloquea, aunque después se escriba el correcto', async () => {
    const { correo, codigo } = await registrarYObtenerCodigo();
    for (let i = 0; i < 5; i += 1) {
      const mal = codigo[0] === 'A' ? `B${codigo.slice(1)}` : `A${codigo.slice(1)}`;
      assert.equal((await verificar(correo, mal)).status, 400);
    }
    assert.equal((await verificar(correo, codigo)).status, 400, 'el código correcto ya no se acepta');
    assert.equal((await usuarioDe(correo)).correo_verificado, 0);
  });

  await t.test('fuerza bruta en paralelo: 30 peticiones a la vez no pueden probar más de 5 códigos', async () => {
    const { correo, codigo } = await registrarYObtenerCodigo();
    const u = await usuarioDe(correo);
    const intentos = Array.from({ length: 30 }, (_, i) => `${'ABCDEFGHJK'[i % 10]}${'MNPQRSTUVW'[(i * 3) % 10]}${'XYZ234'[i % 6]}${'56789A'[(i * 5) % 6]}BC`);
    const respuestas = await Promise.all(intentos.map((c) => verificar(correo, c === codigo ? 'AAAAAA' : c)));
    assert.ok(respuestas.every((r) => r.status === 400));
    assert.equal(Number((await filaCodigo(u.id)).intentos), 5, 'solo se cuentan y comparan 5 intentos');
    assert.equal((await verificar(correo, codigo)).status, 400);
  });

  await t.test('un código vencido no sirve', async () => {
    const { correo, codigo } = await registrarYObtenerCodigo();
    const u = await usuarioDe(correo);
    await pool.execute('UPDATE verificaciones_correo SET expira_en = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE usuario_id = ?', [u.id]);
    assert.equal((await verificar(correo, codigo)).status, 400);
  });

  await t.test('un solo uso: dos peticiones simultáneas con el código correcto activan la cuenta una vez y abren una sola sesión', async () => {
    const { correo, codigo } = await registrarYObtenerCodigo();
    const u = await usuarioDe(correo);
    const [a, b] = await Promise.all([verificar(correo, codigo), verificar(correo, codigo)]);
    assert.deepEqual([a.status, b.status].sort(), [200, 400]);
    const sesiones = (await pool.execute('SELECT COUNT(*) AS n FROM tokens_sesion WHERE usuario_id = ?', [u.id]))[0][0].n;
    assert.equal(Number(sesiones), 1);
  });

  await t.test('reenviar: respeta la espera de 1 minuto y responde igual exista o no el correo', async () => {
    const { correo, codigo } = await registrarYObtenerCodigo();
    const u = await usuarioDe(correo);
    const hashAntes = (await filaCodigo(u.id)).codigo_hash;

    const desde = lineasDeLogs() - 1;
    const rapido = await api('POST', '/auth/reenviar-codigo', { body: { correo } });
    const inexistente = await api('POST', '/auth/reenviar-codigo', { body: { correo: 'nadie.nunca@pruebas.test' } });
    assert.equal(rapido.status, 200);
    assert.deepEqual(rapido.body, inexistente.body, 'la respuesta no revela si el correo existe');
    await new Promise((r) => setTimeout(r, 400));
    assert.equal((await filaCodigo(u.id)).codigo_hash, hashAntes, 'dentro del minuto de espera no se genera otro código');
    assert.equal(await codigoEnviadoA(correo, { desde, espera: 600 }).then((c) => (c && c !== codigo ? c : null)), null);

    // Pasado el minuto sí se envía uno nuevo, y el anterior deja de servir.
    await permitirReenvio(u.id);
    const desde2 = lineasDeLogs() - 1;
    assert.equal((await api('POST', '/auth/reenviar-codigo', { body: { correo } })).status, 200);
    const nuevo = await codigoEnviadoA(correo, { desde: desde2 });
    assert.ok(nuevo && nuevo !== codigo);
    assert.equal((await verificar(correo, codigo)).status, 400, 'el código viejo ya no sirve');
    assert.equal((await verificar(correo, nuevo)).status, 200);
  });

  await t.test('enumeración: registrar un correo que ya tiene cuenta responde igual y no crea nada ni envía código', async () => {
    const { correo, codigo } = await registrarYObtenerCodigo();
    await verificar(correo, codigo); // la cuenta ya está activa
    const antes = (await pool.execute('SELECT COUNT(*) AS n FROM usuarios'))[0][0].n;
    const desde = lineasDeLogs() - 1;

    const repetido = await registrarSinVerificar('cliente', { correo });
    const nuevo = await registrarSinVerificar('cliente');
    assert.equal(repetido.respuesta.status, nuevo.respuesta.status);
    const sinCorreo = ({ correo: _c, ...resto }) => resto;
    assert.deepEqual(sinCorreo(repetido.respuesta.body), sinCorreo(nuevo.respuesta.body), 'misma respuesta en ambos casos');
    assert.equal(Number((await pool.execute('SELECT COUNT(*) AS n FROM usuarios'))[0][0].n), Number(antes) + 1, 'solo se creó la cuenta nueva');
    assert.equal(await codigoEnviadoA(correo, { desde, espera: 600 }), null, 'al dueño no se le envía otro código');
  });

  await t.test('registro con el correo de otra persona: quien lo posee de verdad se queda con la cuenta', async () => {
    const correo = `victima.${Date.now()}@pruebas.test`;
    // 1) Un atacante se registra con el correo de la víctima y SU propia contraseña.
    const atacante = await registrarSinVerificar('cliente', { correo, contrasena: 'Clave-del-atacante-9' });
    assert.equal(atacante.respuesta.status, 202);
    // 2) La víctima (dueña del correo) se registra con el suyo: el último registro gana.
    const victima = await registrarSinVerificar('cliente', { correo, contrasena: 'Clave-de-la-victima-1' });
    assert.equal(victima.respuesta.status, 202);
    const codigo = await codigoEnviadoA(correo, { desde: 0 });
    assert.ok(codigo);
    assert.equal((await verificar(correo, codigo)).status, 200);
    // 3) La contraseña del atacante ya no sirve; la de la víctima sí.
    assert.equal((await api('POST', '/auth/login', { body: { correo, contrasena: 'Clave-del-atacante-9' } })).status, 401);
    assert.equal((await api('POST', '/auth/login', { body: { correo, contrasena: 'Clave-de-la-victima-1' } })).status, 200);
  });

  await t.test('el atacante no puede verificar un correo ajeno sin el código', async () => {
    const { correo } = await registrarYObtenerCodigo();
    for (const c of ['AAAAAA', 'BBBBBB', 'CCCCCC']) assert.equal((await verificar(correo, c)).status, 400);
    assert.equal((await usuarioDe(correo)).correo_verificado, 0);
  });

  await t.test('validaciones: correo con formato inválido se rechaza', async () => {
    for (const correo of ['sin-arroba', 'a@b', '@pruebas.test', 'dos espacios@pruebas.test']) {
      const { respuesta } = await registrarSinVerificar('cliente', { correo });
      assert.equal(respuesta.status, 400, `${correo} debe rechazarse`);
    }
  });

  await t.test('el correo se guarda en minúsculas y sin espacios: no se puede duplicar cambiando mayúsculas', async () => {
    const { correo, codigo } = await registrarYObtenerCodigo();
    const r = await registrarSinVerificar('cliente', { correo: `  ${correo.toUpperCase()}  ` });
    assert.equal(r.respuesta.status, 202);
    assert.equal(Number((await pool.execute('SELECT COUNT(*) AS n FROM usuarios WHERE correo = ?', [correo]))[0][0].n), 1);
    assert.equal((await verificar(correo.toUpperCase(), codigo)).status, 200);
  });

  await t.test('cuentas sin verificar de más de 24 horas se borran y liberan el correo', async () => {
    const { correo } = await registrarYObtenerCodigo();
    await pool.execute("UPDATE usuarios SET fecha_creacion = DATE_SUB(NOW(), INTERVAL 25 HOUR) WHERE correo = ?", [correo]);
    await registrarSinVerificar('cliente'); // cualquier registro limpia las vencidas
    assert.equal(await usuarioDe(correo), undefined);
  });
});
