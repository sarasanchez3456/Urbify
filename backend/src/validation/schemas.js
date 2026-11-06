// Esquemas de validación de las rutas de escritura y de consulta. Los límites (maxLength, rangos, enums)
// son los mismos que declara docs/openapi.yaml y respetan el tamaño de las columnas de schema.sql.
// Si cambias un límite aquí, cámbialo también en el contrato en el mismo commit.

const texto = (max, { min = 0, obligatorio = false, nulo = true } = {}) => ({
  type: nulo && !obligatorio ? ['string', 'null'] : 'string',
  maxLength: max,
  ...(min > 0 ? { minLength: min } : {}),
  // Texto obligatorio: no puede ser solo espacios.
  ...(obligatorio ? { minLength: 1, pattern: '\\S' } : {}),
});

const id = { type: 'integer', minimum: 1, maximum: 2147483647 };
// Las coordenadas pueden llegar como número o como texto numérico (Nominatim devuelve texto); se
// convierten a número antes de validar (ver `numericos` en validate.js).
const latitud = { type: ['number', 'null'], minimum: -90, maximum: 90 };
const longitud = { type: ['number', 'null'], minimum: -180, maximum: 180 };
const telefono = { type: ['string', 'number', 'null'] };
const tarifa = { type: ['number', 'null'], minimum: 0, maximum: 99999999.99 };

module.exports = {
  registro: {
    type: 'object',
    required: ['nombre', 'apellido', 'correo', 'contrasena', 'rol'],
    properties: {
      nombre: texto(100, { obligatorio: true }),
      apellido: texto(100, { obligatorio: true }),
      correo: { type: 'string', maxLength: 150 },
      contrasena: { type: 'string', minLength: 8, maxLength: 72 },
      telefono,
      rol: { type: 'string', enum: ['cliente', 'proveedor'] },
      direccion: texto(255),
      latitud,
      longitud,
      oficio: texto(100),
    },
    numericos: ['latitud', 'longitud'],
  },
  login: {
    type: 'object',
    required: ['correo', 'contrasena'],
    properties: { correo: { type: 'string', maxLength: 150 }, contrasena: { type: 'string', maxLength: 200 } },
  },
  olvidoContrasena: {
    type: 'object',
    required: ['correo'],
    properties: { correo: { type: 'string', maxLength: 150 } },
  },
  restablecerContrasena: {
    type: 'object',
    required: ['correo', 'codigo', 'nueva_contrasena'],
    properties: {
      correo: { type: 'string', maxLength: 150 },
      codigo: { type: 'string', pattern: '^[0-9]{6}$' },
      nueva_contrasena: { type: 'string', minLength: 8, maxLength: 72 },
    },
  },
  perfil: {
    type: 'object',
    properties: {
      nombre: texto(100),
      apellido: texto(100),
      telefono,
      direccion: texto(255),
      latitud,
      longitud,
      foto_url: texto(255),
      oficio: texto(100),
    },
    numericos: ['latitud', 'longitud'],
  },
  categoriaCrear: {
    type: 'object',
    required: ['nombre'],
    properties: { nombre: texto(100, { obligatorio: true }), descripcion: texto(1000), icono_url: texto(255) },
  },
  categoriaEditar: {
    type: 'object',
    properties: { nombre: texto(100), descripcion: texto(1000), icono_url: texto(255) },
  },
  servicioCrear: {
    type: 'object',
    required: ['categoria_id', 'titulo'],
    properties: {
      categoria_id: id,
      titulo: texto(150, { obligatorio: true }),
      descripcion: texto(2000),
      tarifa,
      tipo_tarifa: { type: ['string', 'null'], enum: ['hora', 'fijo', null] },
    },
    numericos: ['tarifa'],
  },
  servicioEditar: {
    type: 'object',
    properties: {
      titulo: texto(150),
      descripcion: texto(2000),
      tarifa,
      tipo_tarifa: { type: ['string', 'null'], enum: ['hora', 'fijo', null] },
      disponible: { type: ['boolean', 'integer', 'null'], enum: [true, false, 0, 1, null] },
    },
    numericos: ['tarifa'],
    booleanos: ['disponible'],
  },
  solicitudCrear: {
    type: 'object',
    required: ['servicio_id', 'fecha_servicio'],
    properties: {
      servicio_id: id,
      fecha_servicio: { type: 'string', maxLength: 40 },
      descripcion: texto(2000),
      direccion: texto(255),
      latitud,
      longitud,
    },
    numericos: ['latitud', 'longitud'],
  },
  solicitudEstado: {
    type: 'object',
    required: ['estado'],
    properties: { estado: { type: 'string', enum: ['pendiente', 'aceptada', 'en_proceso', 'completada', 'cancelada'] } },
  },
  mensajeCrear: {
    type: 'object',
    required: ['contenido'],
    properties: { contenido: { type: 'string', minLength: 1, maxLength: 1000 } },
  },
  calificacionCrear: {
    type: 'object',
    required: ['solicitud_id', 'puntuacion'],
    properties: {
      solicitud_id: id,
      puntuacion: { type: 'integer', minimum: 1, maximum: 5 },
      comentario: texto(1000),
    },
  },
  calificacionEditar: {
    type: 'object',
    properties: { puntuacion: { type: ['integer', 'null'], minimum: 1, maximum: 5 }, comentario: texto(1000) },
  },
  notificacionCrear: {
    type: 'object',
    required: ['usuario_id', 'mensaje'],
    properties: { usuario_id: id, mensaje: { type: 'string', minLength: 1, maxLength: 500 } },
  },

  // Query strings: todos los valores llegan como texto (o como array/objeto si el cliente repite el parámetro).
  consultaBuscar: {
    type: 'object',
    properties: {
      q: { type: 'string', maxLength: 100 },
      categoria_id: { type: 'string', pattern: '^[0-9]{1,10}$' },
      disponible: { type: 'string', pattern: '^[01]$' },
    },
  },
};
