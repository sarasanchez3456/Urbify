# ─────────────────────────────────────────────
# ETAPA 1 – BUILD: Compilar el proyecto React con Vite
# (Esta imagen es temporal, solo sirve para construir)
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos manifiestos para cachear instalación de dependencias
COPY package*.json ./

# Si un antivirus o proxy intercepta HTTPS (por ejemplo Norton Web/Mail Shield) npm falla con errores de certificado o
# se cae a mitad de la instalación. Se puede dar su certificado RAÍZ (público) en base64 y npm confiará en él SIN
# desactivar la verificación:  EXTRA_CA_PEM_B64=<base64> docker compose build   (ver docs/PRESENTACION.md)
ARG EXTRA_CA_PEM_B64=
RUN if [ -n "$EXTRA_CA_PEM_B64" ]; then \
      echo "$EXTRA_CA_PEM_B64" | base64 -d > /tmp/extra-ca.pem && \
      cat /etc/ssl/certs/ca-certificates.crt /tmp/extra-ca.pem > /tmp/ca-bundle.pem && \
      npm config set cafile /tmp/ca-bundle.pem; \
    fi

# Instalamos TODAS las dependencias (incluyendo devDependencies para el build)
RUN npm install

# Copiamos el código fuente
COPY . .

# API relativa: el navegador pide /api/* al propio Nginx, que hace de proxy
# inverso hacia el contenedor backend (ver location /api/ en nginx.conf).
# Evita depender del mapeo de puertos del host y de CORS entre orígenes.
ENV VITE_API_URL=/api

# Ejecutamos el build de producción → genera la carpeta /app/dist
RUN npm run build

# ─────────────────────────────────────────────
# ETAPA 2 – SERVE: Servir los archivos estáticos con Nginx
# (Esta es la imagen final, pequeña y lista para producción)
# ─────────────────────────────────────────────
FROM nginx:1.25-alpine

# Copiamos nuestra configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos los archivos compilados desde la etapa anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx escucha en el puerto 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
