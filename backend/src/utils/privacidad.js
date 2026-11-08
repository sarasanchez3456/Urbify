// Privacidad de los datos de contacto de los proveedores en las rutas públicas.
// Teléfono, dirección y coordenadas exactas solo se muestran a usuarios con sesión de cliente (y admin).
// Anónimos y proveedores no reciben `telefono` ni `direccion` y ven latitud/longitud redondeadas a
// 2 decimales (~1 km), suficiente para ubicar al proveedor en el mapa sin revelar su casa.
const ROLES_CON_CONTACTO = ['cliente', 'admin'];

const veContactoExacto = (req) => ROLES_CON_CONTACTO.includes(req.usuarioRol);

// Redondea una coordenada (que MySQL entrega como texto decimal) a 2 decimales, conservando el tipo texto.
const aproximar = (valor) => (valor === null || valor === undefined || valor === '' ? valor : Number(valor).toFixed(2));

// Devuelve la fila tal cual si el solicitante ve el contacto exacto; si no, una copia sin teléfono ni
// dirección y con coordenadas aproximadas.
function protegerContacto(fila, exacto) {
  if (exacto) return fila;
  const { telefono, direccion, ...resto } = fila;
  if ('latitud' in resto) resto.latitud = aproximar(resto.latitud);
  if ('longitud' in resto) resto.longitud = aproximar(resto.longitud);
  return resto;
}

const protegerLista = (filas, exacto) => (exacto ? filas : filas.map((f) => protegerContacto(f, false)));

module.exports = { veContactoExacto, protegerContacto, protegerLista, aproximar };
