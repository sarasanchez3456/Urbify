#!/bin/bash
# Copia de seguridad de la base de datos (TiDB Cloud o cualquier MySQL) en un archivo .sql.gz
#
# Uso:   scripts/respaldo-bd.sh <archivo-con-datos-de-conexion> [carpeta-de-salida]
# Ej.:   scripts/respaldo-bd.sh D:/urbify/tidb.env D:/urbify/respaldos
#
# El archivo de conexión trae DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y (opcional) DB_NAME, DB_SSL.
# Opcional: CA_PEM=/ruta/certificado.pem  -> certificado raíz del antivirus que intercepta conexiones (Norton).
#
# Seguridad:
#  - La copia lleva datos personales (correos, hashes de contraseña): guárdala FUERA del repositorio
#    (la carpeta "respaldos/" está en .gitignore) y no la compartas por chats.
#  - La contraseña viaja por variable de entorno del contenedor, nunca en la línea de comandos ni en el archivo.
#  - La conexión va cifrada y se verifica el certificado del servidor (no se desactiva la verificación).
#  - No usa --single-transaction (TiDB no soporta los SAVEPOINT que mysqldump usa con esa opción) ni bloquea tablas:
#    la copia no es una "foto" exacta si alguien escribe justo mientras corre; hazla con poco movimiento.
set -euo pipefail

ENV_FILE="${1:?Falta el archivo con los datos de conexión (ver la cabecera del script)}"
SALIDA="${2:-./respaldos}"
[ -f "$ENV_FILE" ] || { echo "No existe $ENV_FILE" >&2; exit 1; }

mkdir -p "$SALIDA"
ARCHIVO="urbify_$(date +%Y%m%d_%H%M%S).sql.gz"
# Solo se permite escribir dentro de la carpeta de salida (el nombre lo genera el script, no el usuario).
cd "$SALIDA"
ABS_SALIDA="$(pwd -W 2>/dev/null || pwd)"   # en Git Bash de Windows, pwd -W da la ruta que entiende Docker
cd - >/dev/null

CA_ARGS=()
[ -n "${CA_PEM:-}" ] && CA_ARGS=(-v "$CA_PEM:/tmp/extra-ca.pem:ro")

MSYS_NO_PATHCONV=1 docker run --rm \
  --env-file "$ENV_FILE" \
  "${CA_ARGS[@]}" \
  -v "$ABS_SALIDA:/salida" \
  -e ARCHIVO="$ARCHIVO" \
  mysql:8.0 bash -c '
    set -euo pipefail
    BUNDLE=/etc/pki/tls/certs/ca-bundle.crt
    if [ -f /tmp/extra-ca.pem ]; then cat "$BUNDLE" /tmp/extra-ca.pem > /tmp/bundle.pem; BUNDLE=/tmp/bundle.pem; fi
    export MYSQL_PWD="$DB_PASSWORD"
    SSL=()
    if [ "${DB_SSL:-}" = "true" ]; then SSL=(--ssl-mode=VERIFY_IDENTITY --ssl-ca="$BUNDLE"); fi
    mysqldump -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" "${SSL[@]}" \
      --no-tablespaces --column-statistics=0 --set-gtid-purged=OFF \
      --routines --skip-lock-tables \
      "${DB_NAME:-urbify_db}" | gzip > "/salida/$ARCHIVO"
  '

# Una copia vacía o diminuta casi siempre es un error silencioso: se avisa.
TAM=$(wc -c < "$SALIDA/$ARCHIVO")
if [ "$TAM" -lt 1000 ]; then echo "ERROR: la copia pesa solo $TAM bytes; algo falló." >&2; rm -f "$SALIDA/$ARCHIVO"; exit 1; fi
echo "Copia creada: $SALIDA/$ARCHIVO ($TAM bytes)"
