// Búsqueda de servicios: por servicio, categoría, nombre del profesional y barrio (este último solo para clientes).
const test = require('node:test');
const assert = require('node:assert/strict');
const { api, registrar, crearServicio, iniciarEntorno } = require('./helpers');

test('búsqueda de servicios (API real + MySQL)', async (t) => {
  const entorno = await iniciarEntorno();
  t.after(() => entorno.cerrar());

  const laureles = await registrar('proveedor', { nombre: 'Zoraida', apellido: 'Quintero', direccion: 'Carrera 70 # 45-12, Laureles, Medellín' });
  const chapinero = await registrar('proveedor', { nombre: 'Ernesto', apellido: 'Baquero', direccion: 'Calle 63 # 9-30, Chapinero, Bogotá' });
  const servLaureles = await crearServicio(laureles, { categoria_id: 1, titulo: 'Reparación de fugas' });
  const servChapinero = await crearServicio(chapinero, { categoria_id: 2, titulo: 'Instalación eléctrica' });
  const cliente = await registrar('cliente');

  const buscar = async (parametros, token) => {
    const r = await api('GET', `/servicios/buscar?${new URLSearchParams(parametros)}`, { token });
    assert.equal(r.status, 200);
    return r.body.map((s) => s.id).sort((a, b) => a - b);
  };

  await t.test('por palabra del servicio', async () => {
    assert.deepEqual(await buscar({ q: 'fugas' }), [servLaureles]);
  });

  await t.test('por filtro de categoría, solo o junto al texto', async () => {
    assert.deepEqual(await buscar({ categoria_id: '2' }), [servChapinero]);
    assert.deepEqual(await buscar({ q: 'fugas', categoria_id: '2' }), []);
  });

  await t.test('por nombre o apellido del profesional (también sin sesión)', async () => {
    assert.deepEqual(await buscar({ q: 'Zoraida' }), [servLaureles]);
    assert.deepEqual(await buscar({ q: 'baquero' }), [servChapinero]);
  });

  await t.test('un cliente encuentra por barrio o ciudad del profesional ("Laureles", "Bogotá")', async () => {
    assert.deepEqual(await buscar({ q: 'Laureles' }, cliente.token), [servLaureles]);
    assert.deepEqual(await buscar({ q: 'Bogotá' }, cliente.token), [servChapinero]);
  });

  await t.test('privacidad: sin sesión (o como proveedor) la búsqueda NO revela direcciones', async () => {
    assert.deepEqual(await buscar({ q: 'Laureles' }), []);
    assert.deepEqual(await buscar({ q: 'Chapinero' }, laureles.token), []);
  });

  await t.test('los comodines y comillas del texto no rompen la consulta ni devuelven todo', async () => {
    assert.deepEqual(await buscar({ q: '%%%' }, cliente.token), []);
    const r = await api('GET', `/servicios/buscar?${new URLSearchParams({ q: "' OR 1=1 --" })}`, { token: cliente.token });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, []);
  });
});
