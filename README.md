<div align="center">

# 🔧 Urbify
### Plataforma que conecta a trabajadores independientes con personas que necesitan servicios para el hogar en Medellín

[![Urbify CI Pipeline](https://github.com/sarasanchez3456/Urbify/actions/workflows/devops.yml/badge.svg)](https://github.com/sarasanchez3456/Urbify/actions/workflows/devops.yml)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Node.js](https://img.shields.io/badge/Backend-Node.js%2020%20%2B%20Express-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/Base%20de%20datos-MySQL%208%20%2F%20TiDB-4479A1?logo=mysql&logoColor=white)

**🌐 Página en producción:** https://urbify-web-gamma.vercel.app · **🔌 API:** https://urbify-api.vercel.app/api/health

**Ficha SENA:** 3223877 · **Programa:** Análisis y Desarrollo de Software (ADSO) · **Instructor:** Jaime Zapata

</div>

---

## 📑 Contenido

1. [¿Qué es Urbify?](#-qué-es-urbify)
2. [Qué puede hacer cada persona](#-qué-puede-hacer-cada-persona)
3. [Arquitectura](#️-arquitectura)
4. [Inicio rápido (Docker)](#-inicio-rápido-docker)
5. [Infraestructura Docker](#-infraestructura-docker)
6. [Publicación en internet](#-publicación-en-internet)
7. [Calidad: CI, pruebas y seguridad](#-calidad-ci-pruebas-y-seguridad)
8. [Variables de entorno](#️-variables-de-entorno)
9. [API REST](#-api-rest)
10. [App móvil](#-app-móvil-repositorio-aparte)
11. [Documentación del proyecto](#-documentación-del-proyecto)
12. [Equipo](#-equipo)

---

## 📋 ¿Qué es Urbify?

**Urbify** es una plataforma web full-stack que conecta a trabajadores técnicos independientes (electricistas, plomeros, carpinteros, etc.) con clientes que necesitan sus servicios en el área metropolitana de Medellín. Centraliza la búsqueda, la contratación, el seguimiento y la calificación de los servicios en un solo lugar.

| | |
|---|---|
| **Frontend** | React 18, Vite, Tailwind, React Router, Leaflet (mapas con OpenStreetMap) y Driver.js (recorridos guiados) |
| **Backend** | Node.js 20, Express 4, API REST con JWT, bcrypt, validación con ajv y límites de peticiones |
| **Base de datos** | MySQL 8 (local y Docker) y TiDB Cloud (producción), 16 tablas |
| **Correo** | Gmail (SMTP) o Resend |
| **Despliegue** | Docker Compose en local; Vercel + TiDB Cloud en producción, con despliegue automático desde GitHub Actions |

---

## 👥 Qué puede hacer cada persona

### Cliente
- 🔍 **Buscar** servicios por palabra y categoría, o **ver proveedores cercanos en un mapa**.
- 📋 **Solicitar** un servicio eligiendo una **fecha y hora futuras** dentro del horario del profesional.
- 💬 **Chatear** con el profesional dentro de cada solicitud y **pedir cambiar la fecha** (reprogramación).
- 🔐 **Código de inicio:** el cliente ve un código de 6 dígitos que debe darle al profesional para que este pueda comenzar el servicio.
- ⭐ **Calificar** al profesional al terminar, y **reportar** un problema.
- 🔔 Recibir **notificaciones** (en la página y por correo) y consultar el **historial** de estados de cada solicitud.

### Proveedor (profesional)
- 🛠️ **Publicar, editar, ocultar y eliminar** sus servicios, con categoría y tarifa (por hora o fija).
- 🗓️ Definir su **horario semanal** y ver su **agenda**; el sistema impide reservas simultáneas o fuera de horario.
- ✅ **Aceptar o rechazar** solicitudes, iniciar el servicio con el código del cliente y marcarlo como completado.
- 💰 Consultar sus **ingresos** y **calificar al cliente** al terminar.

### Doble modo de cuenta
Una misma cuenta (mismo correo) puede ser **cliente y proveedor**: se habilita como proveedor desde el perfil y cambia de modo con un clic. Cada sesión trabaja en un modo activo.

### Administrador
Panel con ocho secciones: **Resumen** (cifras, actividad semanal y alertas), **Usuarios** (detalle, suspender o reactivar, eliminar), **Servicios** (ocultar o mostrar), **Solicitudes** (cancelar), **Categorías** (crear, editar y eliminar), **Reseñas** (ocultar abusivas), **Reportes** (revisar y resolver) y **Auditoría** (todo lo que hace un administrador queda registrado con motivo). El rol `admin` no se crea desde el registro público: [ver Administrador](#administrador-1).

### Para todas las cuentas
Registro con **verificación del correo** (código de 6 caracteres), inicio y cierre de sesión seguros (el cierre invalida el token en el servidor), **recuperación de contraseña** por código, **eliminación de la propia cuenta** y **recorridos guiados** (botón de ayuda) para cada pantalla.

---

## 🏗️ Arquitectura

Tres servicios independientes orquestados con Docker Compose y comunicados por una red interna privada:

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
│  • Cabeceras de seguridad (CSP, X-Frame-Options...) │
│  • SPA con React Router (rutas del lado del cliente)│
└────────────────────────┬────────────────────────────┘
                         │  Red interna: urbify-red
                         │  (DNS: "backend")
┌────────────────────────▼────────────────────────────┐
│           SERVICIO 2: Backend                       │
│         Node.js 20 + Express 4 (puerto 4000)        │
│                                                     │
│  • API REST (rutas → middleware → controladores)    │
│  • Autenticación JWT con sesiones revocables        │
│  • Contraseñas con bcrypt (en hilos de trabajo)     │
│  • Correo con Gmail (SMTP) o Resend                 │
└────────────────────────┬────────────────────────────┘
                         │  Red interna: urbify-red
                         │  (DNS: "db")
┌────────────────────────▼────────────────────────────┐
│           SERVICIO 3: Base de Datos                 │
│              MySQL 8.0 (puerto 3306)                │
│                                                     │
│  • 16 tablas relacionales con claves foráneas       │
│  • Volumen persistente: mysql_data                  │
│  • Esquema inicializado automáticamente             │
└─────────────────────────────────────────────────────┘
```

En **producción** la página y la API viven en **Vercel** (la API como función sin servidor) y los datos en **TiDB Cloud**; ver [Publicación en internet](#-publicación-en-internet).

### Estructura del repositorio

```
Urbify/
├── .github/workflows/devops.yml   ← CI (pruebas) y CD (despliegue a Vercel)
├── backend/
│   ├── Dockerfile
│   ├── .env.example               ← Todas las variables del backend
│   ├── test/                      ← unit/ e integration/ (MySQL real)
│   └── src/
│       ├── index.js               ← Exporta la app; abre el puerto solo si se ejecuta directo
│       ├── config/                ← env.js (validación), db.js (pool), schema.sql
│       ├── routes/                ← Endpoints, agrupados por recurso
│       ├── middleware/            ← Auth JWT, roles, límites, validación, errores
│       ├── controllers/           ← Lógica de negocio
│       ├── validation/            ← Esquemas ajv de cada petición
│       ├── utils/                 ← Agenda, correo, privacidad, historial, auditoría...
│       └── scripts/               ← migrate.js y create-admin.js
├── frontend/
│   ├── Dockerfile · nginx.conf · vercel.json
│   └── src/
│       ├── pages/                 ← Home, Buscar, ServicioDetalle, Dashboard, MisSolicitudes,
│       │                            MiAgenda, MisServicios, Ingresos, Perfil, AdminPanel, Legal
│       ├── components/            ← Paneles, selector de modo, ayuda, notificaciones, mapa...
│       ├── tours/                 ← Recorridos guiados (cliente y proveedor)
│       ├── context/               ← AuthContext (sesión y modo activo)
│       ├── api/                   ← Cliente axios y manejo del token
│       └── utils/                 ← Formatos, ubicación, límites geográficos
├── docs/                          ← Guías y contrato OpenAPI (ver Documentación)
├── scripts/                       ← Despliegue, presentación y copias de seguridad
└── docker-compose.yml             ← Orquestador principal
```

---

## 🚀 Inicio rápido (Docker)

### Requisitos

| Herramienta | Versión mínima | Descarga |
|---|---|---|
| **Git** | 2.x | [git-scm.com](https://git-scm.com) |
| **Docker Desktop** | 4.x | [docker.com/get-started](https://www.docker.com/get-started/) |

> Docker Desktop debe estar **corriendo** antes de ejecutar cualquier comando.

### Atajos según lo que quieras hacer

- 🎤 **Presentar Urbify:** un comando lo levanta todo y comprueba que funcione → [guía de presentación](docs/PRESENTACION.md) (`scripts/presentacion.ps1`).
- 🌐 **Actualizar el sitio publicado:** se hace solo al fusionar a `main` (ver [Publicación en internet](#-publicación-en-internet)).
- ☁️ **Publicar desde cero:** [guía de despliegue en Vercel](docs/DESPLIEGUE_VERCEL.md).

### Paso 1 — Clonar

```bash
git clone https://github.com/sarasanchez3456/Urbify.git
cd Urbify
```

### Paso 2 — Configurar las variables de entorno

`docker-compose.yml` no trae contraseñas ni secretos por defecto. Copia la plantilla y completa `DB_PASSWORD` y `JWT_SECRET` (ver [Variables de entorno](#️-variables-de-entorno)):

```bash
cp .env.example .env
# Para trabajar en local sin HTTPS agrega también NODE_ENV=development
```

### Paso 3 — Levantar los tres servicios

```bash
docker compose up -d --build
```

`up` inicia los servicios, `-d` los deja en segundo plano y `--build` reconstruye las imágenes.

### Paso 4 — Verificar

```bash
docker compose ps              # estado de los contenedores
docker compose logs -f backend # logs del backend (Ctrl+C para salir)
```

```
NAME                STATUS          PORTS
urbify-db           Up (healthy)    127.0.0.1:3306->3306/tcp
urbify-backend      Up              127.0.0.1:4000->4000/tcp
urbify-frontend     Up              0.0.0.0:80->80/tcp
```

| Servicio | URL |
|---|---|
| 🌐 **Aplicación web** | http://localhost |
| 🔌 **API REST** | http://localhost/api/health?deep=1 (también en `http://localhost:4000/api/health`) |
| 🐬 **MySQL** | `localhost:3306` (usuario `root`) |

> En desarrollo, si no hay Gmail ni Resend configurados, el código de verificación del correo **se imprime en la consola del backend**.

### Paso 5 — Crear un administrador (opcional)

```bash
docker compose exec -e ADMIN_EMAIL=admin@ejemplo.com -e ADMIN_PASSWORD='una-clave-larga-12+' backend npm run create-admin
```

### Paso 6 — Detener

```bash
docker compose down        # conserva los datos
docker compose down -v     # ¡borra también el volumen de MySQL!
```

<details>
<summary>🧹 ¿El puerto 3306 está ocupado o quedaron contenedores viejos?</summary>

```bash
docker compose down           # detiene los contenedores de Urbify
docker ps -a                  # identifica contenedores huérfanos
docker stop <NOMBRE_O_ID> && docker rm <NOMBRE_O_ID>   # si otro contenedor usa el 3306
docker system prune -f        # limpieza general de contenedores, redes e imágenes huérfanas
```
</details>

---

## 🌐 Infraestructura Docker

### Red privada `urbify-red` (bridge)
Segmento de red aislado donde solo los contenedores del `docker-compose.yml` se comunican. Dentro de la red cada servicio se alcanza por su **nombre** (el backend usa `host: db`; Nginx hace proxy a `http://backend:4000`), sin IPs estáticas. Los puertos de la base y del backend se publican solo en `127.0.0.1`; el único expuesto al exterior es el 80 del frontend.

### Volumen persistente `mysql_data`
Los contenedores son efímeros; el volumen guarda los archivos de MySQL en el host. Puedes hacer `docker compose down` y volver a subir sin perder usuarios, servicios ni solicitudes. El `name: urbify` del compose fija el prefijo, así que el volumen siempre se llama `urbify_mysql_data` sin importar desde qué carpeta se ejecute.

---

## ☁️ Publicación en internet

| Pieza | Dónde | Dirección |
|---|---|---|
| Página (frontend) | Vercel, proyecto `urbify-web` | https://urbify-web-gamma.vercel.app |
| API (backend) | Vercel, proyecto `urbify-api` (función sin servidor) | https://urbify-api.vercel.app/api |
| Base de datos | TiDB Cloud (compatible con MySQL, conexión con TLS) | — |
| Correo | Gmail por SMTP (puerto 587) | — |

**Despliegue automático:** cada vez que se fusiona un PR a `main`, el workflow ejecuta las pruebas y, **solo si todas pasan**, publica la API y la página y comprueba que respondan (`/api/health?deep=1`, categorías y la página). Necesita el secreto `VERCEL_TOKEN` del repositorio.

> ⚠️ **Las migraciones de la base de datos no corren solas.** Si un cambio modifica las tablas, hay que aplicarlas aparte con `npm run migrate` o con `scripts/desplegar-vercel.ps1 -Migrar` (ver [docs/DESPLIEGUE_VERCEL.md](docs/DESPLIEGUE_VERCEL.md)).

**Cuidados importantes**
- **No cambies `JWT_SECRET` entre despliegues:** al cambiarlo se cierran todas las sesiones abiertas.
- **Copias de seguridad:** TiDB Starter no las garantiza. Usa `scripts/respaldo-bd.sh` y `scripts/restaurar-bd.sh` (guardan la copia fuera del repo). Cada copia contiene datos personales: nunca la subas a Git ni la envíes por chat.
- Si cambia la dirección de Vercel, actualiza `VITE_API_URL`, `CORS_ORIGIN` y la app móvil.

Guías: [docs/DESPLIEGUE_VERCEL.md](docs/DESPLIEGUE_VERCEL.md) (la que se usa) y [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) (comparación de alternativas).

---

## 🔄 Calidad: CI, pruebas y seguridad

### Pipeline de GitHub Actions
**Archivo:** [`.github/workflows/devops.yml`](.github/workflows/devops.yml). Se ejecuta con cada `push` y cada `pull request` a `main`:

```
Push / PR a main
     │
     ├──→ 🔍 Backend ─────────  npm ci · ESLint · el servidor arranca ·
     │                          valida docs/openapi.yaml ·
     │                          pruebas unitarias · pruebas de integración (MySQL 8 real)
     │
     ├──→ 🎨 Frontend ────────  npm ci · ESLint · pruebas (Vitest) · build de Vite · existe dist/
     │
     ├──→ 🐳 Docker ──────────  docker compose config (valida la infraestructura)
     │
     └──→ 🚀 Desplegar ───────  solo en push a main y si TODO lo anterior pasó:
                                publica API y página en Vercel y comprueba que respondan
```

Un error de lint, una prueba fallida o un contrato OpenAPI inválido **bloquea la integración**; nada llega roto a producción.

### Pruebas del backend (desde `backend/`)

| Comando | Qué ejecuta | Necesita MySQL |
|---|---|---|
| `npm test` | Pruebas unitarias de funciones puras (`test/unit/`) | No |
| `npm run test:integration` | Pruebas de integración (`test/integration/`): arrancan el servidor real y lo prueban por HTTP contra una base MySQL de pruebas creada desde `config/schema.sql` | Sí |
| `npm run test:todo` | Las dos anteriores | Sí |

Cubren: reservas simultáneas y fuera de horario, reprogramaciones, cancelaciones, autorización entre usuarios y rutas de administrador, suspensión de cuentas, privacidad de teléfono y dirección, doble modo, código de inicio del servicio, verificación de correo (códigos, fuerza bruta, un solo uso, enumeración), sesiones, notificaciones y avisos en vivo, historial de estados atómico, auditoría administrativa, eliminación de cuenta, límites de peticiones y migraciones sobre una base existente.

Variables opcionales: `DB_HOST` (`127.0.0.1`), `DB_PORT` (`3306`), `DB_USER` (`root`), `DB_PASSWORD`, `TEST_DB_NAME` (`urbify_test`) y `TEST_PORT` (`4100`). **La base `TEST_DB_NAME` se borra y se recrea en cada ejecución: no apuntes a una base con datos.** Ejemplo con el MySQL de `docker compose up -d db`:

```bash
DB_PASSWORD=<tu clave> npm run test:integration
```

### Pruebas del frontend (desde `frontend/`)
`npm test` corre **Vitest** con un navegador simulado; no necesita backend ni base de datos. Cubre la sesión del navegador (solo se guarda el token), el interceptor de Axios, `AuthContext`, la verificación del correo, el código de inicio, la eliminación de cuenta, el campo de dirección, el pie de página y utilidades de formato y ubicación. `npm run lint` ejecuta ESLint.

### Seguridad
- **Contraseñas** con bcrypt; **sesiones JWT** de 7 días guardadas en `tokens_sesion` y revocables (el cierre de sesión las elimina).
- **Rol, modo y estado de la cuenta se leen de la base en cada petición**: una cuenta suspendida pierde el acceso de inmediato (`403 cuenta_suspendida`).
- **Verificación del correo** con código de un solo uso y límites de intentos; la respuesta es igual exista o no la cuenta (no permite averiguar quién está registrado).
- **Límites de peticiones** por IP, por cuenta y por acción (ver [tabla](#límites-de-peticiones-rate-limiting)); no se bloquean cuentas, para que un tercero no pueda dejar fuera a nadie.
- **Validación de todo cuerpo** contra esquemas ajv, límite de tamaño (`413`), cabeceras de seguridad (Helmet y Nginx), CORS con orígenes exactos y HTTPS opcional (`FORCE_HTTPS`).
- **Privacidad:** teléfono, dirección y coordenadas exactas del proveedor solo se muestran a clientes y administradores.
- **Auditoría:** cada acción del administrador queda registrada con su motivo.
- **Secretos** solo por variables de entorno; los `.env` están en `.gitignore`.

---

## 🛠️ Variables de entorno

Plantillas sin valores reales: [`.env.example`](.env.example) (raíz, para `docker compose`) y [`backend/.env.example`](backend/.env.example) (todas las variables del backend, para ejecutarlo sin Docker). El backend lee `backend/.env.<NODE_ENV>` (si existe) y luego `backend/.env`; las variables ya definidas en el proceso (Docker, la plataforma de despliegue) tienen prioridad.

| Variable | development | staging / production |
|---|---|---|
| `NODE_ENV` | `development` (por defecto) | `staging` o `production` (cualquier valor distinto de `development`, `staging`, `production` o `test` impide arrancar) |
| `JWT_SECRET` | opcional (avisa) | **obligatoria**, 32+ caracteres, sin valores de ejemplo |
| `DB_HOST`, `DB_USER`, `DB_NAME`, `DB_PASSWORD` | por defecto de MySQL local | **obligatorias**; `DB_PASSWORD` sin valores de ejemplo |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost` | **obligatoria**: orígenes separados por comas, sin `*`; `https` en production |
| `EMAIL_FROM` | opcional | **obligatoria** |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | opcionales | correo gratis con una cuenta de Gmail y su "contraseña de aplicación"; si están, se usan en lugar de Resend |
| `RESEND_API_KEY` | opcional | alternativa a Gmail (con dominio propio verificado). Sin Gmail ni Resend no se envían correos (en development el código de verificación se imprime en la consola) |
| `DB_SSL`, `DB_POOL_SIZE` | `false`, `10` | `DB_SSL=true` si la base exige TLS (TiDB, Aiven...); `DB_POOL_SIZE=3` en Vercel (un pool por instancia) |
| `AVISOS_EN_VIVO` | `true` | se apaga solo en Vercel (la web consulta cada 30 s); `true`/`false` para forzarlo |
| `CODIGO_INICIO_OBLIGATORIO` | `true` | el proveedor necesita el código de 6 dígitos del cliente para iniciar el servicio; `false` mientras una app (p. ej. la móvil) no lo soporte |
| `BODY_LIMIT` | `100kb` | `100kb` (tamaño máximo del JSON) |
| `TRUST_PROXY` | `0` | nº de proxys delante de la API (Nginx del compose = `1`) |
| `FORCE_HTTPS` | `false` | `true` redirige a HTTPS y activa HSTS (requiere `TRUST_PROXY>=1`) |
| `VITE_API_URL` | — | solo al compilar el frontend para Vercel: dirección de la API (en Docker no se usa: el frontend llama a `/api`) |

### Límites de peticiones (rate limiting)

Cuando se supera un límite la API responde `429` con `{"error", "bloqueado": true, "minutos_restantes"}` y las cabeceras `Retry-After`, `RateLimit` y `RateLimit-Policy`. Los valores por defecto no afectan el uso normal de la web ni de la app móvil; se ajustan por entorno:

| Límite | Variable | Por defecto |
|---|---|---|
| Ventana de los límites generales y de login | `RATE_LIMIT_WINDOW_SECONDS` | `900` (15 min) |
| Todas las rutas `/api` (excepto `/api/health`), por IP | `RATE_LIMIT_GLOBAL` | `1500` por ventana |
| Lecturas públicas (búsqueda, cercanos, destacados, categorías, stats, calificaciones y `/api/health`), por IP | `RATE_LIMIT_PUBLIC_PER_MINUTE` | `120` por minuto |
| Registro, por IP | `RATE_LIMIT_REGISTER_PER_HOUR` | `10` por hora |
| Recuperación de contraseña: pedir código, por IP y por correo (restablecer admite el triple) | `RATE_LIMIT_RECOVERY_IP_PER_HOUR` / `RATE_LIMIT_RECOVERY_EMAIL_PER_HOUR` | `10` / `3` por hora |
| Verificación de correo, intentos de código: por IP / por correo | `RATE_LIMIT_VERIFY_IP_PER_HOUR` / `RATE_LIMIT_VERIFY_EMAIL_PER_HOUR` | `30` / `10` por hora |
| Envío de códigos (registro y reenvío): por IP / por correo | `RATE_LIMIT_SEND_CODE_IP_PER_HOUR` / `RATE_LIMIT_SEND_CODE_EMAIL_PER_HOUR` | `15` / `5` por hora |
| Doble modo, por usuario: cambios de modo / activaciones como proveedor | `RATE_LIMIT_MODE_SWITCH_PER_HOUR` / `RATE_LIMIT_BECOME_PROVIDER_PER_HOUR` | `30` / `10` por hora |
| Código de inicio, por usuario: intentos de iniciar un servicio / códigos nuevos generados | `RATE_LIMIT_START_CODE_PER_HOUR` / `RATE_LIMIT_START_CODE_RENEW_PER_HOUR` | `30` / `10` por hora |
| Login, por IP (cualquier intento) | `RATE_LIMIT_LOGIN_IP` | `30` por ventana |
| Login, intentos **fallidos** a una misma cuenta desde una misma IP | `RATE_LIMIT_LOGIN_ACCOUNT_IP` | `5` por ventana |
| Login, intentos **fallidos** a una cuenta desde cualquier IP | `RATE_LIMIT_LOGIN_ACCOUNT` | `20` por ventana |
| Desactivar (solo desarrollo/pruebas) | `RATE_LIMIT_ENABLED=false` | activo |

El antiguo bloqueo de cuenta (3 fallos = 5 min bloqueada) se eliminó: permitía que un tercero dejara fuera a cualquiera escribiendo su correo. Ahora los fallos limitan a la IP que los causa y la persona real puede entrar desde otra red; el tope por cuenta (20) solo se alcanza con un ataque distribuido. Los límites se guardan en memoria, así que valen para **una** instancia del backend (en Vercel pueden ser más débiles; lo crítico conserva límites por cuenta y por correo); con varias instancias hay que usar un almacén compartido (p. ej. Redis). Con `TRUST_PROXY` mal configurado todos los usuarios compartirían la IP del proxy.

Los valores numéricos, los booleanos (`true`/`false`, en minúsculas) y `BODY_LIMIT` (número con `b`, `kb` o `mb`, de 1 byte a 10 mb) se validan siempre: un valor inválido impide arrancar en lugar de aceptarse en silencio.

Si en `staging`/`production` falta algo o es un valor de ejemplo, el backend **no arranca** y lista qué corregir (sin imprimir los secretos). Genera un `JWT_SECRET` con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> **Seguridad:** los archivos `.env` están en `.gitignore` y **nunca deben subirse** al repositorio. Despliega inyectando las variables desde la plataforma (secretos del proveedor). Si el puerto 4000 del backend se expone directamente (sin Nginx/balanceador delante), deja `TRUST_PROXY=0`; con `TRUST_PROXY>=1` la IP del cliente se toma de `X-Forwarded-For`, que un cliente directo podría falsear.

### Administrador

El rol `admin` no se puede crear desde el registro público (`POST /api/auth/registro` solo acepta `cliente` y `proveedor`). El primer administrador se crea desde el servidor, con credenciales tomadas del entorno:

```bash
cd backend
ADMIN_EMAIL=admin@ejemplo.com ADMIN_PASSWORD='clave-larga-de-12+' npm run create-admin
```

Si el correo ya existe, ese usuario se promueve a `admin`. En una base de datos anterior, ejecuta antes `npm run migrate` para que el esquema esté al día.

---

## 📡 API REST

> **Contrato completo:** [`docs/openapi.yaml`](docs/openapi.yaml) (OpenAPI 3.0) es la fuente única para backend, web y app móvil: roles por endpoint, errores, formatos y versionado. Valídalo con `npx @redocly/cli@2 lint docs/openapi.yaml --extends minimal` (el CI lo hace en cada PR). Para verlo con interfaz: cárgalo en [editor.swagger.io](https://editor.swagger.io).

Todas las rutas cuelgan de `/api`. Los errores siempre tienen la forma `{"error": "mensaje"}`. Resumen por recurso (los detalles, roles y códigos de respuesta están en el contrato):

| Recurso | Endpoints principales |
|---|---|
| **Salud** | `GET /health` (con `?deep=1` consulta también la base y responde `503` si no contesta; limitado por IP) |
| **Auth** | `POST /auth/registro` (crea la cuenta sin verificar y envía un código; no devuelve token), `/auth/verificar-correo`, `/auth/reenviar-codigo`, `/auth/login`, `/auth/logout`, `/auth/olvido-contrasena`, `/auth/restablecer-contrasena`, `GET/PUT /auth/perfil`, `/auth/ser-proveedor`, `/auth/cambiar-modo` |
| **Categorías** | `GET /categorias` (público); crear, editar y eliminar solo `admin` |
| **Servicios** | `GET /servicios/buscar`, `/servicios/destacados`, `/servicios/categoria/:id`, `/servicios/:id`; `GET /servicios/mios`, crear, editar y eliminar (proveedor) |
| **Solicitudes** | Crear, listar (cliente/proveedor), `PUT /solicitudes/:id/estado`, código de inicio, historial, reprogramaciones, chat (`/mensajes`) y eliminar; `POST /reportes` |
| **Calificaciones** | Calificar una solicitud completada, editar y eliminar; el profesional califica al cliente |
| **Proveedores** | `GET /proveedores/cercanos`, `/proveedores/:id/agenda`, `GET/PUT /proveedores/mi-horario` |
| **Notificaciones** | Listar, marcar leídas, eliminar y `GET /notificaciones/stream` (avisos en vivo, SSE) |
| **Estadísticas** | `GET /stats` (cifras públicas) y `GET /stats/admin` (solo `admin`) |
| **Administración** | `/admin/resumen`, `/admin/usuarios`, `/admin/servicios`, `/admin/solicitudes`, `/admin/resenas`, `/admin/reportes` y `/admin/auditoria` (solo `admin`) |

**Privacidad:** `telefono` y `direccion` del proveedor y sus coordenadas exactas solo se devuelven a usuarios con sesión de `cliente` o `admin`; anónimos y proveedores no reciben `telefono` ni `direccion` y ven latitud/longitud redondeadas a 2 decimales (igual en `/proveedores/cercanos`, donde `distancia_km` se redondea a 0,5 km).

**Fechas:** se guardan y responden en UTC (ISO 8601); una fecha enviada sin zona se interpreta como hora de Colombia (UTC-5).

**Notificaciones de chat:** incluyen `tipo: "mensaje"` y `solicitud_id`; la web los usa para abrir el chat de esa solicitud.

---

## 📱 App móvil (repositorio aparte)

La app Android **no está en este repositorio**. Vive en un repo independiente:

> **https://github.com/sarasanchez3456/Urbify-Mobile** — Android nativo (Kotlin + Jetpack Compose)

Son **proyectos separados** pero **dependen entre sí**: la app móvil consume esta misma API REST.

| | Backend (este repo) | App móvil (`Urbify-Mobile`) |
|---|---|---|
| Se ejecuta con | `docker compose up -d` | Android Studio → emulador |
| La app apunta a | — | `http://10.0.2.2:4000/api/` (`10.0.2.2` = `localhost` del host visto desde el emulador) |
| Requisito | — | backend y emulador en la **misma máquina** (si el backend está en otro PC, cambiar `BASE_URL` en `RetrofitClient.kt`) |

**Al clonar en limpio** se crea una base **nueva y vacía**: el `schema.sql` solo siembra las **8 categorías**, sin usuarios ni servicios. Los datos locales viven en tu volumen `urbify_mysql_data`, nunca en el repositorio.

**Compatibilidad:** los nombres de campo del JSON deben coincidir entre backend y app; usa siempre la versión más reciente de ambos repos. Mientras la app móvil no soporte el **código de inicio** del servicio, `CODIGO_INICIO_OBLIGATORIO=false` permite iniciar servicios sin él. Las rutas que usa la app están en [`docs/RUTAS_MOVIL.md`](docs/RUTAS_MOVIL.md).

---

## 📚 Documentación del proyecto

**En este repositorio (`docs/`)**

| Documento | Para qué sirve |
|---|---|
| [`openapi.yaml`](docs/openapi.yaml) | Contrato de la API (OpenAPI 3.0) |
| [`DESPLIEGUE_VERCEL.md`](docs/DESPLIEGUE_VERCEL.md) | Publicar y actualizar Urbify en Vercel + TiDB + Gmail |
| [`DESPLIEGUE.md`](docs/DESPLIEGUE.md) | Comparación de alternativas de hosting |
| [`PRESENTACION.md`](docs/PRESENTACION.md) | Levantar y comprobar todo antes de una presentación |
| [`AUTORIZACION.md`](docs/AUTORIZACION.md) | Qué puede hacer cada rol en cada recurso |
| [`AUTENTICACION_WEB.md`](docs/AUTENTICACION_WEB.md) | Estrategia de sesión de la página web |
| [`RUTAS_MOVIL.md`](docs/RUTAS_MOVIL.md) | Rutas y cambios que debe seguir la app móvil |
| [`GUIA_REVISION.md`](docs/GUIA_REVISION.md) y [`VERIFICACION_HITO2.md`](docs/VERIFICACION_HITO2.md) | Historial de la revisión del Hito 2 |

**Entregables académicos (carpeta "Proyecto Urbify" en Drive)**

| Hito | Contenido |
|---|---|
| **Hito 1** | Acta de constitución, documento de requerimientos e historias de usuario |
| **Hito 2** | Diagramas de casos de uso, clases y actividades, y modelo relacional |
| **Hito 3** | Diagrama de paquetes, diagrama de secuencia, documentación de la API y diagrama de despliegue |

**Scripts útiles (`scripts/`):** `presentacion.ps1`, `desplegar-vercel.ps1` / `.sh` (despliegue manual, con `-Que api|web` y `-Migrar`), `respaldo-bd.sh` y `restaurar-bd.sh`.

---

## 👩‍💻 Equipo

Proyecto integrador del programa **Análisis y Desarrollo de Software (ADSO)** del SENA, Ficha **3223877**, con el acompañamiento del instructor Jaime Zapata.

| Integrante | Rol |
|---|---|
| Juan Pablo Serna | Líder del proyecto, planeación y apoyo en backend |
| Sara Sánchez | Desarrollo y frontend |
| Cristian Mesa | Backend y base de datos |
| David Díaz | Análisis y documentación |

---

<div align="center">
Hecho con ❤️ en Medellín, Colombia 🇨🇴
</div>
