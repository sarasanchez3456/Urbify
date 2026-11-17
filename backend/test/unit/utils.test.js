// Pruebas de las funciones puras del backend (no necesitan base de datos). Ejecutar con: npm test
const test = require('node:test');
const assert = require('node:assert/strict');

const { errorDeDireccion } = require('../../src/utils/direccion');
const { validarMotivos, motivosAColumna, motivosDeColumna } = require('../../src/utils/motivosCalificacion');
const { posicionUsuario, posicionesNotificacion, suscribir, avisar } = require('../../src/utils/avisos');
const { motivoValido } = require('../../src/utils/auditoria.pure');

test('dirección: vacía o ausente es válida (es opcional)', () => {
  for (const v of [undefined, null, '']) assert.equal(errorDeDireccion(v), null);
});

test('dirección: acepta direcciones normales de Colombia', () => {
  for (const v of ['Calle 10 # 5-20, Bogotá', 'Carrera 43A #1-50, Medellín', "Cra. 70 #45-12 (Laureles)", 'Av. 6N 25/30']) {
    assert.equal(errorDeDireccion(v), null, v);
  }
});

test('dirección: rechaza muy corta, solo espacios, símbolos y demasiado larga', () => {
  for (const v of ['ab', '      ', '<script>alert(1)</script>', 'Calle 5; DROP TABLE', 'a'.repeat(256), 123]) {
    assert.ok(errorDeDireccion(v), String(v));
  }
});

test('motivos de calificación: los positivos solo valen con puntuación alta y los negativos con baja', () => {
  assert.equal(validarMotivos(['puntual'], 5), null);
  assert.ok(validarMotivos(['puntual'], 1), 'un motivo positivo con 1 estrella debe rechazarse');
  assert.ok(validarMotivos(['no_existe'], 5), 'un código desconocido debe rechazarse');
  assert.ok(validarMotivos(['a', 'a'], 5), 'no se permiten motivos repetidos');
});

test('motivos de calificación: se guardan y se leen sin perder datos', () => {
  assert.deepEqual(motivosDeColumna(motivosAColumna(['puntual', 'buena_comunicacion'])), ['puntual', 'buena_comunicacion']);
  assert.deepEqual(motivosDeColumna(null), []);
});

test('avisos: encuentra el parámetro del destinatario sin importar el orden de las columnas', () => {
  assert.equal(posicionUsuario('INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)'), 0);
  assert.equal(posicionUsuario("INSERT INTO notificaciones (tipo, solicitud_id, usuario_id, mensaje) VALUES ('solicitud', ?, ?, ?)"), 1);
  assert.equal(posicionUsuario('INSERT INTO notificaciones (usuario_id, tipo, solicitud_id, mensaje) VALUES (?, ?, ?, ?)'), 0);
  assert.equal(posicionUsuario('SELECT * FROM notificaciones'), -1);
});

test('avisos: solo recibe el evento el usuario al que va dirigido', () => {
  const a = { escrito: [], write(x) { this.escrito.push(x); }, on() {} };
  const b = { escrito: [], write(x) { this.escrito.push(x); }, on() {} };
  suscribir(901, a);
  suscribir(902, b);
  avisar(901, { id: 7 });
  assert.equal(a.escrito.length, 1);
  assert.match(a.escrito[0], /event: notificacion/);
  assert.equal(b.escrito.length, 0);
});

test('motivo de auditoría: entre 10 y 300 caracteres, sin contar espacios de los lados', () => {
  assert.equal(motivoValido('corto'), null);
  assert.equal(motivoValido('   suficiente motivo   '), 'suficiente motivo');
  assert.equal(motivoValido('x'.repeat(301)), null);
  assert.equal(motivoValido(undefined), null);
});
test('avisos: encuentra también la posición del modo en el INSERT', () => {
  assert.deepEqual(posicionesNotificacion("INSERT INTO notificaciones (tipo, solicitud_id, usuario_id, modo, mensaje) VALUES ('solicitud', ?, ?, ?, ?)"), { usuario: 1, modo: 2 });
  assert.deepEqual(posicionesNotificacion('INSERT INTO notificaciones (usuario_id, modo, tipo, solicitud_id, mensaje) VALUES (?, ?, ?, ?, ?)'), { usuario: 0, modo: 1 });
  assert.deepEqual(posicionesNotificacion('INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)'), { usuario: 0, modo: -1 });
  assert.deepEqual(posicionesNotificacion('SELECT * FROM notificaciones'), { usuario: -1, modo: -1 });
});

test('avisos: una conexión solo recibe los avisos de su modo y los generales', () => {
  const nueva = () => ({ escrito: [], write(x) { this.escrito.push(x); }, on() {} });
  const comoCliente = nueva();
  const comoProveedor = nueva();
  const sinModo = nueva(); // administrador: no tiene modo y recibe todo
  suscribir(910, comoCliente, 'cliente');
  suscribir(910, comoProveedor, 'proveedor');
  suscribir(910, sinModo, null);

  avisar(910, { id: 1, modo: 'proveedor' });
  assert.equal(comoCliente.escrito.length, 0, 'el aviso de proveedor no llega a la conexión en modo cliente');
  assert.equal(comoProveedor.escrito.length, 1);
  assert.equal(sinModo.escrito.length, 1);

  avisar(910, { id: 2, modo: 'cliente' });
  assert.equal(comoCliente.escrito.length, 1);
  assert.equal(comoProveedor.escrito.length, 1, 'el aviso de cliente no llega a la conexión en modo proveedor');

  avisar(910, { id: 3, modo: null }); // general: llega a todas
  assert.equal(comoCliente.escrito.length, 2);
  assert.equal(comoProveedor.escrito.length, 2);
  assert.equal(sinModo.escrito.length, 3);
});
