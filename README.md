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

### Paso 3 — Configurar las variables de entorno e iniciar la aplicación

`docker-compose.yml` ya no trae contraseñas ni secretos por defecto. Copia la plantilla y completa `DB_PASSWORD` y `JWT_SECRET` (ver [Variables de Entorno](#️-variables-de-entorno)):

```bash
cp .env.example .env
# Para trabajar en local sin HTTPS agrega también NODE_ENV=development
```

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
- El volumen se llama `urbify_mysql_data` (el `name: urbify` del `docker-compose.yml` fija el prefijo, así que es el mismo sin importar desde qué carpeta se ejecute `docker compose`).

---

## 📱 App Móvil — repositorio aparte

La app Android **no está en este repositorio**. Vive en un repo Git independiente:

> **https://github.com/sarasanchez3456/Urbify-Mobile** — Android nativo (Kotlin + Jetpack Compose)

Ambos repos son **proyectos separados** pero **dependen entre sí**: la app móvil consume exactamente esta misma API REST. Si trabajas en el móvil, clona y mantén actualizados **los dos**.

### Cómo se conectan

| | Backend (este repo) | App móvil (`Urbify-Mobile`) |
|---|---|---|
| Se ejecuta con | `docker compose up -d` | Android Studio → emulador |
| La app apunta a | — | `http://10.0.2.2:4000/api/` (`10.0.2.2` = `localhost` del host visto desde el emulador) |
| Requisito | — | backend y emulador en la **misma máquina** (si el backend está en otro PC, cambiar `BASE_URL` en `RetrofitClient.kt`) |

### Al clonar en limpio

1. `git clone` de **este** repo → `docker compose up -d --build` → se crea una base de datos **nueva y vacía**; el `schema.sql` solo siembra las **8 categorías**, sin usuarios ni servicios.
2. `git clone` de **`Urbify-Mobile`** → compilar y ejecutar en el emulador.
3. Cada dev registra sus propios usuarios y datos. **Los datos que tengas localmente viven solo en tu volumen `urbify_mysql_data`, nunca en el repositorio** — nadie los recibe al clonar.

### Compatibilidad de versiones

Los nombres de campo del JSON (`id`, `categoria_id`, `tarifa`, …) deben coincidir entre backend y app. **Usa siempre la versión más reciente de ambos repos**: una app antigua contra un backend nuevo (o viceversa) muestra campos vacíos o falla al crear servicios/solicitudes.

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

Plantillas sin valores reales: [`.env.example`](.env.example) (raíz, para `docker compose`) y [`backend/.env.example`](backend/.env.example) (todas las variables del backend, para ejecutarlo sin Docker).

El backend lee `backend/.env.<NODE_ENV>` (si existe) y luego `backend/.env`; las variables ya definidas en el proceso (Docker, la plataforma de despliegue) tienen prioridad.

| Variable | development | staging / production |
|---|---|---|
| `NODE_ENV` | `development` (por defecto) | `staging` o `production` |
| `JWT_SECRET` | opcional (avisa) | **obligatoria**, 32+ caracteres, sin valores de ejemplo |
| `DB_HOST`, `DB_USER`, `DB_NAME`, `DB_PASSWORD` | por defecto de MySQL local | **obligatorias**; `DB_PASSWORD` sin valores de ejemplo |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost` | **obligatoria**: orígenes separados por comas, sin `*`; `https` en production |
| `EMAIL_FROM` | opcional | **obligatoria** |
| `RESEND_API_KEY` | opcional | recomendada (sin ella no se envían correos) |
| `BODY_LIMIT` | `100kb` | `100kb` (tamaño máximo del JSON) |
| `TRUST_PROXY` | `0` | nº de proxys delante de la API (Nginx del compose = `1`) |
| `FORCE_HTTPS` | `false` | `true` redirige a HTTPS y activa HSTS (requiere `TRUST_PROXY>=1`) |

#### Límites de peticiones (rate limiting)

Cuando se supera un límite la API responde `429` con `{"error", "bloqueado": true, "minutos_restantes"}` y las cabeceras `Retry-After`, `RateLimit` y `RateLimit-Policy`. Los valores por defecto no afectan el uso normal de la web ni de la app móvil; se ajustan por entorno:

| Límite | Variable | Por defecto |
|---|---|---|
| Ventana de los límites generales y de login | `RATE_LIMIT_WINDOW_SECONDS` | `900` (15 min) |
| Todas las rutas `/api` (excepto `/api/health`), por IP | `RATE_LIMIT_GLOBAL` | `1500` por ventana |
| Lecturas públicas (búsqueda, cercanos, destacados, categorías, stats, calificaciones), por IP | `RATE_LIMIT_PUBLIC_PER_MINUTE` | `120` por minuto |
| Registro, por IP | `RATE_LIMIT_REGISTER_PER_HOUR` | `10` por hora |
| Recuperación de contraseña: pedir código, por IP y por correo (restablecer admite el triple) | `RATE_LIMIT_RECOVERY_IP_PER_HOUR` / `RATE_LIMIT_RECOVERY_EMAIL_PER_HOUR` | `10` / `3` por hora |
| Login, por IP (cualquier intento) | `RATE_LIMIT_LOGIN_IP` | `30` por ventana |
| Login, intentos **fallidos** a una misma cuenta desde una misma IP | `RATE_LIMIT_LOGIN_ACCOUNT_IP` | `5` por ventana |
| Login, intentos **fallidos** a una cuenta desde cualquier IP | `RATE_LIMIT_LOGIN_ACCOUNT` | `20` por ventana |
| Desactivar (solo desarrollo/pruebas) | `RATE_LIMIT_ENABLED=false` | activo |

El antiguo bloqueo de cuenta (3 fallos = 5 min bloqueada) se eliminó: permitía que un tercero dejara fuera a cualquiera escribiendo su correo. Ahora los fallos limitan a la IP que los causa y la persona real puede entrar desde otra red; el tope por cuenta (20) solo se alcanza con un ataque distribuido. Los límites se guardan en memoria, así que valen para **una** instancia del backend; con varias hay que usar un almacén compartido (p. ej. Redis). Con `TRUST_PROXY` mal configurado todos los usuarios compartirían la IP del proxy.

Si en `staging`/`production` falta algo o es un valor de ejemplo, el backend **no arranca** y lista qué corregir (sin imprimir los secretos). Genera un `JWT_SECRET` con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> **Seguridad:** Los archivos `.env` están en `.gitignore` y **nunca deben subirse** al repositorio. Despliega inyectando las variables desde la plataforma (secretos del proveedor), no en archivos del repo. Si el puerto 4000 del backend se expone directamente (sin Nginx/balanceador delante), deja `TRUST_PROXY=0`; con `TRUST_PROXY>=1` la IP del cliente se toma de `X-Forwarded-For`, que un cliente directo podría falsear.

### Administrador

El rol `admin` no se puede crear desde el registro público (`POST /api/auth/registro` solo acepta `cliente` y `proveedor`). El primer administrador se crea desde el servidor, con credenciales tomadas del entorno:

```bash
cd backend
ADMIN_EMAIL=admin@ejemplo.com ADMIN_PASSWORD='clave-larga-de-12+' npm run create-admin
```

Si el correo ya existe, ese usuario se promueve a `admin`. En una base de datos anterior, ejecuta antes `npm run migrate` para que el esquema acepte el rol `admin`.

---

## 📡 Endpoints de la API REST

> **Contrato completo:** [`docs/openapi.yaml`](docs/openapi.yaml) (OpenAPI 3.0) es la fuente única para backend, web y app móvil: roles por endpoint, errores, formatos y estrategia de versionado. Valídalo con `npx @redocly/cli@1 lint docs/openapi.yaml`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servidor |
| POST | `/api/auth/registro` | Registro de usuario (`cliente` o `proveedor`) |
| POST | `/api/auth/login` | Inicio de sesión |
| POST | `/api/auth/logout` | Cierra la sesión: elimina el token enviado en `Authorization: Bearer` de `tokens_sesion`. Responde `200 {"mensaje"}`; después, ese token recibe `401` (web y app móvil deben llamarla antes de borrar el token local) |
| POST | `/api/auth/olvido-contrasena` | Envía un código de 6 dígitos al correo (respuesta genérica); ver [`docs/RUTAS_MOVIL.md`](docs/RUTAS_MOVIL.md) |
| POST | `/api/auth/restablecer-contrasena` | Cambia la contraseña con `{correo, codigo, nueva_contrasena}` y cierra las sesiones |
| GET | `/api/categorias` | Listar categorías |
| GET | `/api/servicios` | Listar servicios |
| POST | `/api/solicitudes` | Crear solicitud (`servicio_id` y `fecha_servicio` futura obligatorios; el proveedor se toma del servicio) |
| GET / POST | `/api/solicitudes/:id/mensajes` | Chat de la solicitud: solo su cliente y su proveedor (`{contenido}`, 1–1000 caracteres) |
| GET | `/api/proveedores` | Buscar proveedores |
| GET | `/api/stats` | Estadísticas públicas de la página de inicio (3 cifras) |
| GET | `/api/stats/admin` | Estadísticas completas del sistema (solo `admin`) |
| GET | `/api/notificaciones` | Notificaciones del usuario |

---

## 👩‍💻 Equipo de Desarrollo

Desarrollado como proyecto integrador del programa **Análisis y Desarrollo de Software (ADSO)** del SENA — Ficha **3223877**.

---

<div align="center">
Hecho con ❤️ en Medellín, Colombia 🇨🇴
</div>
