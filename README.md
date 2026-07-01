<div align="center">

# 🔧 Urbify
### Plataforma de conexión entre trabajadores técnicos y clientes en Medellín

[![Urbify CI Pipeline](https://github.com/sarasanchez3456/Urbify/actions/workflows/devops.yml/badge.svg)](https://github.com/sarasanchez3456/Urbify/actions/workflows/devops.yml)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20v20-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/Database-MySQL%208.0-4479A1?logo=mysql&logoColor=white)

**Ficha SENA:** 3223877 | **Programa:** ADSO | **Instructor:** Efren Moreno Valoyes

</div>

---

## 📋 Descripción del Proyecto

**Urbify** es una plataforma web full-stack que conecta a trabajadores técnicos independientes (electricistas, plomeros, carpinteros, etc.) con clientes que necesitan sus servicios en la ciudad de Medellín.

La plataforma permite:
- 🔍 **Buscar** proveedores de servicios por categoría y ubicación geográfica
- 📋 **Solicitar** servicios con seguimiento de estado en tiempo real
- ⭐ **Calificar** proveedores tras la finalización del servicio
- 🔒 **Autenticación segura** con JWT y protección contra fuerza bruta
- 📧 **Notificaciones por correo** al aceptar o completar solicitudes

---

## 🏗️ Arquitectura de Microservicios

La aplicación está compuesta por **3 servicios independientes**, orquestados con Docker Compose y comunicados a través de una red interna privada:

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTE (Navegador)               │
│                    localhost:80                      │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│           SERVICIO 1: Frontend                      │
│      React 18 + Vite → compilado y servido por      │
│           Nginx 1.25 (puerto 80)                    │
│                                                     │
│  • Proxy reverso: /api/* → backend:4000             │
│  • SPA con React Router (rutas client-side)         │
└────────────────────────┬────────────────────────────┘
                         │  Red interna: urbify-red
                         │  (DNS: "backend")
┌────────────────────────▼────────────────────────────┐
│           SERVICIO 2: Backend                       │
│         Node.js 20 + Express 4 (puerto 4000)        │
│                                                     │
│  • API REST con 8 módulos de rutas                  │
│  • Autenticación JWT                                │
│  • Hashing con bcryptjs                             │
│  • Notificaciones con Resend                        │
└────────────────────────┬────────────────────────────┘
                         │  Red interna: urbify-red
                         │  (DNS: "db")
┌────────────────────────▼────────────────────────────┐
│           SERVICIO 3: Base de Datos                 │
│              MySQL 8.0 (puerto 3306)                │
│                                                     │
│  • 7 tablas relacionales (usuarios, servicios,      │
│    solicitudes, calificaciones, notificaciones...)  │
│  • Volumen persistente: mysql_data                  │
│  • Schema inicializado automáticamente              │
└─────────────────────────────────────────────────────┘

           🌐 Red privada: urbify-red (bridge)
           💾 Volumen persistente: mysql_data
```

### Estructura del Repositorio

```
Urbify/
├── 📁 .github/
│   └── 📁 workflows/
│       └── devops.yml          ← Pipeline de CI con GitHub Actions
├── 📁 backend/
│   ├── Dockerfile              ← Imagen Node.js 20 Alpine
│   ├── package.json
│   ├── .env.example            ← Variables de entorno de referencia
│   └── 📁 src/
│       ├── index.js            ← Punto de entrada de la API
│       ├── 📁 config/
│       │   ├── db.js           ← Pool de conexiones MySQL
│       │   └── schema.sql      ← DDL: crea las tablas al iniciar
│       ├── 📁 routes/          ← Endpoints de la API REST
│       ├── 📁 controllers/     ← Lógica de negocio
│       ├── 📁 middleware/      ← Auth JWT, validaciones
│       └── 📁 utils/
├── 📁 frontend/
│   ├── Dockerfile              ← Build React + Serve con Nginx
│   ├── nginx.conf              ← Config del servidor web
│   ├── vite.config.js
│   └── 📁 src/
│       ├── 📁 pages/           ← Páginas (Home, Dashboard, etc.)
│       ├── 📁 components/      ← Componentes reutilizables
│       ├── 📁 context/         ← AuthContext (estado global)
│       └── 📁 api/             ← Llamadas axios al backend
└── docker-compose.yml          ← Orquestador principal
```

---

## ✅ Requisitos Previos

Antes de comenzar, asegúrate de tener instalados:

| Herramienta | Versión Mínima | Descarga |
|---|---|---|
| **Git** | 2.x | [git-scm.com](https://git-scm.com) |
| **Docker Desktop** | 4.x | [docker.com/get-started](https://www.docker.com/get-started/) |

> **Nota:** Docker Desktop debe estar **corriendo** antes de ejecutar cualquier comando. En Windows, verifica que el ícono de Docker en la bandeja del sistema esté activo.

---

## 🚀 Despliegue Local (Paso a Paso)

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/sarasanchez3456/Urbify.git
cd Urbify
```

### Paso 2 — Limpiar el entorno (contenedores y puertos huérfanos)

> Ejecuta estos comandos si ya habías intentado correr el proyecto antes, o si el puerto 3306 aparece ocupado.

```bash
# Detener y eliminar los contenedores de Urbify (si existen)
docker compose down

# Eliminar también el volumen de datos (¡CUIDADO: borra los datos de MySQL!)
# Solo úsalo si quieres un ambiente 100% limpio
docker compose down -v

# Ver todos los contenedores activos (para identificar huérfanos)
docker ps -a

# Si el puerto 3306 está bloqueado por un contenedor diferente, eliminarlo:
# docker stop <NOMBRE_O_ID_DEL_CONTENEDOR>
# docker rm <NOMBRE_O_ID_DEL_CONTENEDOR>

# Limpiar contenedores detenidos, redes e imágenes huérfanas (limpieza general)
docker system prune -f
```

### Paso 3 — Iniciar toda la aplicación

```bash
# Un solo comando: construye las imágenes e inicia los 3 servicios en segundo plano
docker compose up -d --build
```

**¿Qué hace este comando?**
- `up` → Inicia todos los servicios
- `-d` → En segundo plano (*detached mode*)
- `--build` → Reconstruye las imágenes Docker antes de iniciar

### Paso 4 — Verificar que todo está corriendo

```bash
# Ver el estado de los contenedores
docker compose ps

# Ver los logs en tiempo real (Ctrl+C para salir)
docker compose logs -f

# Ver solo los logs del backend
docker compose logs -f backend
```

**Resultado esperado:**

```
NAME                STATUS          PORTS
urbify-db           Up (healthy)    0.0.0.0:3306->3306/tcp
urbify-backend      Up              0.0.0.0:4000->4000/tcp
urbify-frontend     Up              0.0.0.0:80->80/tcp
```

### Paso 5 — Acceder a la aplicación

| Servicio | URL |
|---|---|
| 🌐 **Aplicación web** | http://localhost |
| 🔌 **API REST** | http://localhost:4000/api/health |
| 🐬 **MySQL** | `localhost:3306` (usuario: `root`) |

### Paso 6 — Detener la aplicación

```bash
# Detener los contenedores (los datos se conservan)
docker compose down

# Detener Y eliminar el volumen de datos (reinicio total)
docker compose down -v
```

---

## 🌐 Infraestructura Docker

### Red Privada: `urbify-red` (tipo bridge)

La red de tipo **bridge** crea un segmento de red privado e aislado donde solo los contenedores definidos en `docker-compose.yml` pueden comunicarse entre sí.

**Ventajas clave:**
- **Aislamiento:** Los contenedores de Urbify no pueden ser accedidos por otros contenedores en la máquina que no pertenezcan a esta red.
- **DNS automático:** Dentro de la red, cada servicio es accesible por su **nombre** (no por IP). Así, el backend puede conectarse a MySQL simplemente usando `host: db`, y Nginx puede hacer proxy al backend usando `http://backend:4000`. No se necesitan IPs estáticas.

### Volumen Persistente: `mysql_data`

Un volumen nombrado en Docker es como un **disco duro externo virtual** gestionado por Docker.

**¿Por qué es vital?**
- Los contenedores son **efímeros** por diseño (si los borras, pierdes todo lo que estaba dentro).
- El volumen `mysql_data` almacena los archivos de MySQL en el *host* de forma persistente.
- Puedes hacer `docker compose down` y volver a levantar con `docker compose up` sin perder ningún usuario, servicio o solicitud registrada.

---

## 🔄 Pipeline de CI con GitHub Actions

**Archivo:** [`.github/workflows/devops.yml`](.github/workflows/devops.yml)

El pipeline se activa automáticamente con cada `push` o `pull request` a la rama `main` y ejecuta **3 jobs en paralelo/secuencia**:

```
Push a main
     │
     ├──→ [Job 1] 🔍 Backend CI ──────────┐
     │    • npm ci                         │  (en paralelo)
     │    • node --check src/index.js      │
     │                                     │
     ├──→ [Job 2] 🎨 Frontend CI ─────────┤
     │    • npm ci                         │
     │    • npm run build (Vite)           │
     │    • Verifica carpeta dist/         │
     │                                     │
     └────────────────────────────────────→ [Job 3] 🐳 Docker CI
                                              • docker compose config
                                              • Valida sintaxis del compose
```

**¿Qué garantiza este pipeline?**
- ✅ Que el código del backend tiene **sintaxis JavaScript válida**
- ✅ Que el frontend **compila correctamente** en modo producción
- ✅ Que la **infraestructura Docker** está correctamente definida
- ❌ Ningún error llega silenciosamente a la rama principal

---

## 🛠️ Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto (o usa las variables directamente en el compose). Referencia en [`backend/.env.example`](backend/.env.example):

```env
DB_PASSWORD=tu_contraseña_segura
JWT_SECRET=una_cadena_aleatoria_larga_y_segura
```

> **Seguridad:** El archivo `.env` está en `.gitignore` y **nunca debe subirse** al repositorio.

---

## 📡 Endpoints de la API REST

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servidor |
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Inicio de sesión |
| GET | `/api/categorias` | Listar categorías |
| GET | `/api/servicios` | Listar servicios |
| POST | `/api/solicitudes` | Crear solicitud |
| GET | `/api/proveedores` | Buscar proveedores |
| GET | `/api/stats` | Estadísticas del dashboard |
| GET | `/api/notificaciones` | Notificaciones del usuario |

---

## 👩‍💻 Equipo de Desarrollo

Desarrollado como proyecto integrador del programa **Análisis y Desarrollo de Software (ADSO)** del SENA — Ficha **3223877**.

---

<div align="center">
Hecho con ❤️ en Medellín, Colombia 🇨🇴
</div>
