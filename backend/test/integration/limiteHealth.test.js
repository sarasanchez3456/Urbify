// /api/health es público y con ?deep=1 consulta la base de datos en cada llamada: tiene el límite por IP de las lecturas
// públicas para que nadie pueda gastar la cuota de la base o del hosting llamándolo sin parar.
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciarEntorno, URL_BASE } = require('./helpers');

test('límite de peticiones de /api/health (API real + MySQL)', async (t) => {
  // Se arranca con un límite bajo; el propio arranque ya consume algunas llamadas del cupo.
  const entorno = await iniciarEntorno({ RATE_LIMIT_PUBLIC_PER_MINUTE: '25' });
  t.after(() => entorno.cerrar());

  await t.test('al superar el límite responde 429 con el formato habitual, y antes responde 200', async () => {
    const estados = [];
    let bloqueo = null;
    for (let i = 0; i < 60; i += 1) {
      const r = await fetch(`${URL_BASE}/health?deep=1`);
      estados.push(r.status);
      if (r.status === 429 && !bloqueo) bloqueo = await r.json();
    }
    assert.ok(estados.includes(429), `debió bloquear en algún momento: ${[...new Set(estados)]}`);
    assert.ok(estados.indexOf(200) !== -1 || estados[0] === 429, 'las primeras llamadas (o ya el cupo del arranque) se atienden');
    assert.ok(estados.filter((s) => s === 200).length <= 25, 'nunca se atienden más llamadas que el límite');
    assert.equal(bloqueo.bloqueado, true);
    assert.ok(bloqueo.minutos_restantes >= 1);
  });

  await t.test('un comprobador normal (pocas llamadas por minuto) no se ve afectado en un servidor con el límite por defecto', async () => {
    // Ver el otro caso de prueba: aquí solo se documenta que el límite por defecto es de 120 por minuto.
    const { rateLimit } = require('../../src/config/env');
    assert.ok(rateLimit.publico >= 60, `el límite público por defecto debe dejar pasar un healthcheck normal (${rateLimit.publico}/min)`);
  });
});
