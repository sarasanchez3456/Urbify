// Eliminación de cuentas (cliente, proveedor y, desde el panel, la de otras personas).
//
// - Sin historial (nunca tuvo solicitudes, calificaciones ni reportes): se BORRA la fila y todo lo que cuelga de ella.
// - Con historial: la otra parte de cada solicitud conserva su registro, así que la cuenta se ANONIMIZA: se borran
//   sus datos personales y sus sesiones, queda desactivada y su correo pasa a un valor que nadie puede usar.
//   Los servicios del proveedor se ocultan.
// - Con solicitudes abiertas (pendiente, aceptada o en proceso) no se elimina: hay que cancelarlas o terminarlas.
//
// Se llama dentro de una transacción (`conn` viene de enTransaccion).
const SUFIJO_ELIMINADA = '@eliminada.invalid';
// Fragmento SQL para dejar fuera de los listados y de las cifras las cuentas ya anonimizadas.
const SQL_SIN_ELIMINADAS = `correo NOT LIKE '%${SUFIJO_ELIMINADA}'`;
const ESTADOS_ABIERTOS = ['pendiente', 'aceptada', 'en_proceso'];

async function contar(conn, sql, params) {
  const [[fila]] = await conn.execute(sql, params);
  return Number(fila.n);
}

async function eliminarCuenta(conn, id) {
  const abiertas = await contar(
    conn,
    `SELECT COUNT(*) AS n FROM solicitudes
      WHERE (cliente_id = ? OR proveedor_id = ?) AND estado IN (${ESTADOS_ABIERTOS.map(() => '?').join(', ')})`,
    [id, id, ...ESTADOS_ABIERTOS]
  );
  if (abiertas > 0) return { resultado: 'con_solicitudes_abiertas', abiertas };

  const historial =
    (await contar(conn, 'SELECT COUNT(*) AS n FROM solicitudes WHERE cliente_id = ? OR proveedor_id = ?', [id, id])) +
    (await contar(conn, 'SELECT COUNT(*) AS n FROM calificaciones WHERE cliente_id = ? OR proveedor_id = ?', [id, id])) +
    (await contar(conn, 'SELECT COUNT(*) AS n FROM calificaciones_cliente WHERE cliente_id = ? OR proveedor_id = ?', [id, id])) +
    (await contar(conn, 'SELECT COUNT(*) AS n FROM reportes WHERE reportante_id = ? OR reportado_id = ?', [id, id])) +
    (await contar(conn, 'SELECT COUNT(*) AS n FROM reprogramaciones WHERE solicitado_por = ?', [id]));

  if (historial === 0) {
    await conn.execute('DELETE FROM usuarios WHERE id = ?', [id]);
    return { resultado: 'borrada' };
  }

  // Anonimizar: lo que identifica a la persona se borra; las filas ajenas que la mencionan siguen apuntando a ella.
  await conn.execute('DELETE FROM tokens_sesion WHERE usuario_id = ?', [id]);
  await conn.execute('DELETE FROM notificaciones WHERE usuario_id = ?', [id]);
  await conn.execute('DELETE FROM verificaciones_correo WHERE usuario_id = ?', [id]);
  await conn.execute('DELETE FROM recuperaciones_contrasena WHERE usuario_id = ?', [id]);
  await conn.execute('DELETE FROM disponibilidad_proveedor WHERE proveedor_id = ?', [id]);
  await conn.execute('UPDATE servicios SET disponible = 0 WHERE proveedor_id = ?', [id]);
  await conn.execute(
    `UPDATE usuarios
        SET nombre = 'Cuenta', apellido = 'eliminada', correo = ?, contrasena = '!eliminada', telefono = NULL,
            foto_url = NULL, direccion = NULL, latitud = NULL, longitud = NULL, oficio = NULL, categoria_id = NULL,
            activo = 0, correo_verificado = 1, intentos_fallidos = 0, bloqueado_hasta = NULL
      WHERE id = ?`,
    [`eliminada-${id}${SUFIJO_ELIMINADA}`, id]
  );
  return { resultado: 'anonimizada' };
}

module.exports = { eliminarCuenta, SQL_SIN_ELIMINADAS, SUFIJO_ELIMINADA };
