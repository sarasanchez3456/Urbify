// Validación central de entrada con JSON Schema (ajv). Los esquemas viven en validation/schemas.js.
// Cualquier incumplimiento responde 400 {error} con un mensaje claro; nunca llega a la base de datos.
const Ajv = require('ajv');
const schemas = require('../validation/schemas');

const ajv = new Ajv({ allErrors: false, strict: false });
const cache = new Map();
const compilar = (nombre) => {
  if (!schemas[nombre]) throw new Error(`Esquema de validación desconocido: ${nombre}`);
  if (!cache.has(nombre)) {
    const { numericos, booleanos, ...schema } = schemas[nombre];
    cache.set(nombre, { validar: ajv.compile(schema), numericos: numericos || [], booleanos: booleanos || [] });
  }
  return cache.get(nombre);
};

const TIPOS = { string: 'texto', number: 'número', integer: 'número entero', boolean: 'verdadero/falso', object: 'objeto', array: 'lista', null: 'vacío' };
const nombreDeTipo = (t) => (Array.isArray(t) ? t.filter((x) => x !== 'null') : [t]).map((x) => TIPOS[x] || x).join(' o ');

function mensaje(err) {
  const campo = (err.instancePath || '').split('/').filter(Boolean).join('.') || (err.params && err.params.missingProperty) || 'el cuerpo';
  switch (err.keyword) {
    case 'required': return `${err.params.missingProperty} es requerido`;
    case 'type': return `${campo} debe ser ${nombreDeTipo(err.params.type)}`;
    case 'maxLength': return `${campo} no puede superar ${err.params.limit} caracteres`;
    case 'minLength': return err.params.limit === 1 ? `${campo} no puede estar vacío` : `${campo} debe tener al menos ${err.params.limit} caracteres`;
    case 'pattern': return err.params.pattern === '\\S' ? `${campo} no puede estar vacío` : `${campo} no tiene un formato válido`;
    case 'minimum': return `${campo} debe ser mayor o igual a ${err.params.limit}`;
    case 'maximum': return `${campo} debe ser menor o igual a ${err.params.limit}`;
    case 'enum': return `${campo} debe ser uno de: ${err.params.allowedValues.filter((v) => v !== null).join(', ')}`;
    default: return `${campo} no es válido`;
  }
}

const NUMERICO = /^-?\d+(\.\d+)?$/;

// Valida req.body. Convierte a número los campos listados en `numericos` cuando llegan como texto numérico
// y a 0/1 los `booleanos`, de modo que los controladores reciben siempre tipos coherentes.
const validarBody = (nombre) => {
  const { validar, numericos, booleanos } = compilar(nombre);
  return (req, res, next) => {
    const body = req.body;
    for (const k of numericos) if (typeof body[k] === 'string' && NUMERICO.test(body[k].trim())) body[k] = Number(body[k]);
    if (!validar(body)) return res.status(400).json({ error: mensaje(validar.errors[0]) });
    for (const k of booleanos) if (typeof body[k] === 'boolean') body[k] = body[k] ? 1 : 0;
    return next();
  };
};

// Valida req.query (texto, o array/objeto si el parámetro se repite o usa corchetes).
const validarQuery = (nombre) => {
  const { validar } = compilar(nombre);
  return (req, res, next) => (validar(req.query) ? next() : res.status(400).json({ error: mensaje(validar.errors[0]) }));
};

// Parámetros de ruta que son ids: un valor que no sea entero positivo no puede existir (404, igual que un id inexistente).
const ID_VALIDO = /^[1-9][0-9]{0,9}$/;
const idParams = (router, ...nombres) => {
  for (const n of nombres) {
    router.param(n, (req, res, next, valor) => (ID_VALIDO.test(valor) && Number(valor) <= 2147483647 ? next() : res.status(404).json({ error: 'Recurso no encontrado' })));
  }
};

module.exports = { validarBody, validarQuery, idParams };
