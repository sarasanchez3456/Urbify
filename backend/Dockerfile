# ─────────────────────────────────────────────
# ETAPA 1: Imagen base de Node.js (Alpine = versión ultra liviana)
# ─────────────────────────────────────────────
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos primero solo los manifiestos para aprovechar el caché de Docker
# (si package.json no cambia, Docker no reinstala dependencias)
COPY package*.json ./

# Instalamos solo dependencias de producción
RUN npm install --omit=dev

# Copiamos el resto del código fuente
COPY src/ ./src/

# El backend escucha en el puerto 4000
EXPOSE 4000

# Comando para arrancar la aplicación
CMD ["node", "src/index.js"]
