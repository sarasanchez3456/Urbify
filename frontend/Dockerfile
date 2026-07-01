# ─────────────────────────────────────────────
# ETAPA 1 – BUILD: Compilar el proyecto React con Vite
# (Esta imagen es temporal, solo sirve para construir)
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos manifiestos para cachear instalación de dependencias
COPY package*.json ./

# Instalamos TODAS las dependencias (incluyendo devDependencies para el build)
RUN npm install

# Copiamos el código fuente
COPY . .

# Variables de entorno de producción (el backend corre en el mismo host Docker)
ENV VITE_API_URL=http://localhost:4000/api

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
