# ─────────────────────────────────────────────
# ETAPA 1: Imagen base de Node.js (Alpine = versión ultra liviana)
# ─────────────────────────────────────────────
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos primero solo los manifiestos para aprovechar el caché de Docker
# (si package.json no cambia, Docker no reinstala dependencias)
COPY package*.json ./

# Si un antivirus o proxy intercepta HTTPS (por ejemplo Norton Web/Mail Shield) npm falla con errores de certificado o
# se cae a mitad de la instalación. Se puede dar su certificado RAÍZ (público) en base64 y npm confiará en él SIN
# desactivar la verificación:  EXTRA_CA_PEM_B64=<base64> docker compose build   (ver docs/PRESENTACION.md)
ARG EXTRA_CA_PEM_B64=
RUN if [ -n "$EXTRA_CA_PEM_B64" ]; then \
      echo "$EXTRA_CA_PEM_B64" | base64 -d > /tmp/extra-ca.pem && \
      cat /etc/ssl/certs/ca-certificates.crt /tmp/extra-ca.pem > /tmp/ca-bundle.pem && \
      cp /tmp/extra-ca.pem /etc/ssl/extra-ca.pem && \
      npm config set cafile /tmp/ca-bundle.pem; \
    fi

# Instalamos solo dependencias de producción
RUN npm install --omit=dev && npm ls --omit=dev --depth=0 > /dev/null

# Copiamos el resto del código fuente
COPY src/ ./src/

# El backend escucha en el puerto 4000
EXPOSE 4000

# Comando para arrancar la aplicación
CMD ["node", "src/index.js"]
