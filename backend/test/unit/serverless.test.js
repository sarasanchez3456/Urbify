// Urbify como función sin servidor (Vercel): la app se IMPORTA (no abre puerto) y el trabajo en segundo plano no rompe nada.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..', '..');

test('importar src/index.js exporta la app Express y NO abre ningún puerto', () => {
  const guion = `
    const http = require('http');
    const app = require('./src/index.js');
    if (typeof app !== 'function' || typeof app.use !== 'function') { console.log('NO_ES_APP'); process.exit(2); }
    const servidor = http.createServer(app).listen(0, async () => {
      const r = await fetch('http://127.0.0.1:' + servidor.address().port + '/api/health');
      console.log('SALUD', r.status, JSON.stringify(await r.json()));
      servidor.close();
    });
  `;
  const r = spawnSync(process.execPath, ['-e', guion], {
    cwd: RAIZ,
    encoding: 'utf8',
    timeout: 20000,
    env: {
      ...process.env, NODE_ENV: 'development', VERCEL: '1', PORT: '4123', JWT_SECRET: 'clave-de-pruebas-sin-servidor-0123456789-abcdef',
      DB_HOST: '127.0.0.1', DB_PORT: '1', DB_USER: 'nadie', DB_PASSWORD: 'nada', RESEND_API_KEY: '', GMAIL_USER: '', GMAIL_APP_PASSWORD: '',
    },
  });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /SALUD 200 .*"status":"ok"/);
  assert.ok(!/Urbify API corriendo en puerto/.test(r.stdout), 'al importar no debe abrir el puerto');
  assert.ok(!/MySQL no disponible aún|No se pudo conectar a MySQL/.test(r.stdout + r.stderr), 'en Vercel no se reintenta la conexión en segundo plano');
});

test('mantenerVivo: nunca rompe la respuesta aunque la tarea falle', async () => {
  const { mantenerVivo } = require('../../src/utils/segundoPlano');
  const original = console.error;
  const registros = [];
  console.error = (...args) => registros.push(args.join(' '));
  try {
    await mantenerVivo(Promise.reject(new Error('fallo de prueba')), 'Contexto');
    assert.ok(registros.some((l) => l.includes('Contexto') && l.includes('fallo de prueba')), 'el error se registra en el log');
    assert.equal(await mantenerVivo(Promise.resolve(7), 'Contexto'), 7);
  } finally {
    console.error = original;
  }
});
