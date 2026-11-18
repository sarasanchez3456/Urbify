#!/bin/bash
# Restaura una copia hecha con scripts/respaldo-bd.sh en una base MySQL/TiDB.
#
# Uso:   CONFIRMAR=si scripts/restaurar-bd.sh <copia.sql.gz> <archivo-con-datos-de-la-base-destino>
#
# La base destino debe existir y estar VACÍA (o se pisan sus tablas: el volcado trae DROP TABLE).
# Por eso exige CONFIRMAR=si: restaurar sobre la base real borra lo que haya hoy.
# Para ensayar, apunta a una base desechable (ver docs/DESPLIEGUE_VERCEL.md, "Copias de seguridad").
#
# TiDB pone a todas las claves foráneas el mismo nombre ("fk_1") y MySQL lo rechaza (los nombres deben ser únicos
# en toda la base). Se quitan los nombres al restaurar: MySQL genera unos únicos y las relaciones quedan iguales.
# Opcional: CA_PEM=/ruta/certificado.pem (certificado raíz de un antivirus que intercepta conexiones).
set -euo pipefail

COPIA="${1:?Falta la copia .sql.gz}"
ENV_FILE="${2:?Falta el archivo con los datos de la base destino}"
[ -f "$COPIA" ] && [ -f "$ENV_FILE" ] || { echo "No existe la copia o el archivo de conexión" >&2; exit 1; }
[ "${CONFIRMAR:-}" = "si" ] || { echo "Esto sobrescribe las tablas de la base destino. Repite con CONFIRMAR=si si estás seguro." >&2; exit 1; }

CA_ARGS=()
[ -n "${CA_PEM:-}" ] && CA_ARGS=(-v "$CA_PEM:/tmp/extra-ca.pem:ro")

gzip -dc "$COPIA" | sed -E 's/CONSTRAINT `fk_[0-9]+` FOREIGN KEY/FOREIGN KEY/' | \
MSYS_NO_PATHCONV=1 docker run --rm -i --env-file "$ENV_FILE" "${CA_ARGS[@]}" mysql:8.0 bash -c '
  set -euo pipefail
  BUNDLE=/etc/pki/tls/certs/ca-bundle.crt
  if [ -f /tmp/extra-ca.pem ]; then cat "$BUNDLE" /tmp/extra-ca.pem > /tmp/bundle.pem; BUNDLE=/tmp/bundle.pem; fi
  export MYSQL_PWD="$DB_PASSWORD"
  SSL=()
  if [ "${DB_SSL:-}" = "true" ]; then SSL=(--ssl-mode=VERIFY_IDENTITY --ssl-ca="$BUNDLE"); fi
  mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" "${SSL[@]}" "${DB_NAME:-urbify_db}"
'
echo "Restauración terminada en ${ENV_FILE}."
