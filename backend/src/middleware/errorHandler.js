// Manejador global de errores. Convierte los errores de MySQL causados por datos del usuario en 400/409
// con un mensaje claro; el resto responde 500 genérico (el detalle solo va al log, nunca a la respuesta).
const MYSQL = {
  // Dato demasiado largo / fuera de rango / con formato inválido para la columna -> 400
  ER_DATA_TOO_LONG: [400, 'Uno de los valores es demasiado largo'],
  ER_WARN_DATA_OUT_OF_RANGE: [400, 'Un valor numérico está fuera del rango permitido'],
  ER_DATA_OUT_OF_RANGE: [400, 'Un valor numérico está fuera del rango permitido'],
  ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: [400, 'Uno de los valores no tiene un formato válido'],
  ER_TRUNCATED_WRONG_VALUE: [400, 'Uno de los valores no tiene un formato válido'],
  ER_WARN_DATA_TRUNCATED: [400, 'Uno de los valores no tiene un formato válido'],
  ER_BAD_NULL_ERROR: [400, 'Falta un valor obligatorio'],
  ER_NO_DEFAULT_FOR_FIELD: [400, 'Falta un valor obligatorio'],
  ER_CHECK_CONSTRAINT_VIOLATED: [400, 'Uno de los valores no cumple las reglas permitidas'],
  // Duplicado -> 409
  ER_DUP_ENTRY: [409, 'Ya existe un registro con esos datos'],
  // Clave foránea -> 409 (borrar algo referenciado) / 400 (referenciar algo que no existe)
  ER_ROW_IS_REFERENCED_2: [409, 'No se puede completar la operación porque hay datos relacionados'],
  ER_ROW_IS_REFERENCED: [409, 'No se puede completar la operación porque hay datos relacionados'],
  ER_NO_REFERENCED_ROW_2: [400, 'Uno de los datos hace referencia a algo que no existe'],
  ER_NO_REFERENCED_ROW: [400, 'Uno de los datos hace referencia a algo que no existe'],
};
const POR_ERRNO = { 1406: 'ER_DATA_TOO_LONG', 1264: 'ER_WARN_DATA_OUT_OF_RANGE', 1265: 'ER_WARN_DATA_TRUNCATED', 1366: 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD', 1292: 'ER_TRUNCATED_WRONG_VALUE', 1048: 'ER_BAD_NULL_ERROR', 1062: 'ER_DUP_ENTRY', 1451: 'ER_ROW_IS_REFERENCED_2', 1452: 'ER_NO_REFERENCED_ROW_2', 3819: 'ER_CHECK_CONSTRAINT_VIOLATED' };

function estadoDe(err) {
  const codigo = MYSQL[err.code] ? err.code : POR_ERRNO[err.errno];
  return codigo ? MYSQL[codigo] : null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Cuerpo demasiado grande o JSON mal formado: errores del cliente.
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  const mysql = estadoDe(err);
  if (mysql) return res.status(mysql[0]).json({ error: mysql[1] });
  console.error('Error no manejado:', err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { errorHandler };
