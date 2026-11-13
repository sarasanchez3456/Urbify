// Piezas puras de la verificación de correo: el código y la comprobación del dominio.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ALFABETO, LONGITUD, generarCodigo, normalizarCodigo, hashDeCodigo, codigoCoincide } = require('../../src/utils/codigoVerificacion');
const { dominioPuedeRecibirCorreo } = require('../../src/utils/dominioCorreo');

test('el código tiene 6 caracteres, solo mayúsculas/dígitos y nunca caracteres confusos', () => {
  assert.equal(LONGITUD, 6);
  assert.equal(new Set(ALFABETO).size, ALFABETO.length, 'sin letras repetidas');
  for (const prohibido of ['0', 'O', '1', 'I', 'L']) assert.ok(!ALFABETO.includes(prohibido), `${prohibido} no debe estar`);
  for (let i = 0; i < 500; i += 1) assert.match(generarCodigo(), /^[A-HJKMNP-Z2-9]{6}$/);
});

test('los códigos generados varían (no son predecibles ni constantes)', () => {
  const codigos = new Set(Array.from({ length: 300 }, generarCodigo));
  assert.ok(codigos.size > 290);
});

test('normalizarCodigo: minúsculas, espacios y guiones se aceptan; lo que no es un código da null', () => {
  assert.equal(normalizarCodigo('abc234'), 'ABC234');
  assert.equal(normalizarCodigo(' ab c-2 34 '), 'ABC234');
  assert.equal(normalizarCodigo('ABC23'), null, 'muy corto');
  assert.equal(normalizarCodigo('ABC2345'), null, 'muy largo');
  assert.equal(normalizarCodigo('ABC23O'), null, 'la O no existe en el alfabeto');
  assert.equal(normalizarCodigo('ABC231'), null, 'el 1 no existe en el alfabeto');
  assert.equal(normalizarCodigo("ABC23'; DROP"), null);
  assert.equal(normalizarCodigo(123456), null);
  assert.equal(normalizarCodigo(null), null);
  assert.equal(normalizarCodigo({ $ne: '' }), null);
});

test('el hash está ligado al usuario y se compara sin delatar coincidencias parciales', () => {
  const h = hashDeCodigo('ABC234', 7);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.notEqual(h, hashDeCodigo('ABC234', 8), 'el mismo código en otra cuenta da otro hash');
  assert.ok(codigoCoincide('ABC234', 7, h));
  assert.ok(!codigoCoincide('ABC235', 7, h));
  assert.ok(!codigoCoincide('ABC234', 8, h));
  assert.ok(!codigoCoincide('ABC234', 7, ''));
  assert.ok(!codigoCoincide('ABC234', 7, undefined));
  assert.ok(!codigoCoincide('ABC234', 7, 'no-es-hex'));
});

test('dominioPuedeRecibirCorreo: acepta dominios con MX o con dirección, rechaza los que no existen', async () => {
  const noExiste = Object.assign(new Error('x'), { code: 'ENOTFOUND' });
  const resolutor = (mx, a) => ({
    resolveMx: async () => { if (mx instanceof Error) throw mx; return mx; },
    resolve4: async () => { if (a instanceof Error) throw a; return a; },
  });
  assert.equal(await dominioPuedeRecibirCorreo('a@gmail.com', resolutor([{ exchange: 'mx.google.com', priority: 10 }], noExiste)), true);
  assert.equal(await dominioPuedeRecibirCorreo('a@solo-a.com', resolutor(noExiste, ['1.2.3.4'])), true);
  assert.equal(await dominioPuedeRecibirCorreo('a@gmial.invalido', resolutor(noExiste, noExiste)), false);
  assert.equal(await dominioPuedeRecibirCorreo('a@sinpunto', resolutor([], [])), false);
});

test('dominioPuedeRecibirCorreo: si el DNS falla o tarda, se deja pasar (el código es la prueba real)', async () => {
  const caido = { resolveMx: async () => { throw Object.assign(new Error('x'), { code: 'ECONNREFUSED' }); }, resolve4: async () => [] };
  assert.equal(await dominioPuedeRecibirCorreo('a@gmail.com', caido), true);
  const lento = { resolveMx: () => new Promise(() => {}), resolve4: () => new Promise(() => {}) };
  assert.equal(await dominioPuedeRecibirCorreo('a@gmail.com', lento, 50), true);
});
