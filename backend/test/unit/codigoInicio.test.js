// Issue #57: derivación y comprobación del código de inicio (funciones puras, sin base de datos).
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-pruebas-unitarias-con-32-caracteres-o-mas';
const {
  DIGITOS, MAX_INTENTOS, nuevaSal, derivarCodigo, codigoCorrecto, normalizarCodigo, sinDatosDeCodigo,
} = require('../../src/utils/codigoInicio');

test('código de inicio: 6 dígitos, estable para la misma solicitud y sal', () => {
  const sal = nuevaSal();
  assert.match(sal, /^[0-9a-f]{32}$/);
  const codigo = derivarCodigo(15, sal);
  assert.equal(DIGITOS, 6);
  assert.match(codigo, /^\d{6}$/);
  assert.equal(derivarCodigo(15, sal), codigo);
  assert.equal(derivarCodigo('15', sal), codigo, 'el id puede llegar como texto desde la URL');
  assert.equal(MAX_INTENTOS, 5);
});

test('código de inicio: depende de la solicitud y de la sal', () => {
  const sal = nuevaSal();
  // Con muchas solicitudes, casi todos los códigos son distintos (no hay un código fijo ni uno por sal).
  const codigos = new Set(Array.from({ length: 200 }, (_, i) => derivarCodigo(i + 1, sal)));
  assert.ok(codigos.size > 190);
  const porSal = new Set(Array.from({ length: 200 }, () => derivarCodigo(1, nuevaSal())));
  assert.ok(porSal.size > 190);
});

test('código de inicio: solo acepta el código exacto de esa solicitud', () => {
  const sal = nuevaSal();
  const codigo = derivarCodigo(3, sal);
  assert.equal(codigoCorrecto(3, sal, codigo), true);
  assert.equal(codigoCorrecto(4, sal, codigo), false, 'otra solicitud');
  assert.equal(codigoCorrecto(3, nuevaSal(), codigo), false, 'otra sal (código renovado)');
  assert.equal(codigoCorrecto(3, null, codigo), false, 'sin sal no hay código válido');
  for (const malo of ['', '12345', '1234567', 'abcdef', null, undefined, 123456]) {
    assert.equal(codigoCorrecto(3, sal, malo), false, String(malo));
  }
});

test('código de inicio: se aceptan espacios y guiones al escribirlo', () => {
  assert.equal(normalizarCodigo(' 123 456 '), '123456');
  assert.equal(normalizarCodigo('123-456'), '123456');
  assert.equal(normalizarCodigo(123456), '123456');
  assert.equal(normalizarCodigo(undefined), '');
  assert.equal(normalizarCodigo({}), '');
});

test('código de inicio: las columnas internas no salen en las respuestas', () => {
  assert.deepEqual(sinDatosDeCodigo({ id: 1, estado: 'aceptada', codigo_inicio_sal: 'x', codigo_inicio_intentos: 2 }), { id: 1, estado: 'aceptada' });
});
