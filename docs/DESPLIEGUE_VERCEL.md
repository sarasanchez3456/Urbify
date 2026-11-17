# Despliegue de Urbify en Vercel + TiDB Cloud + Gmail (camino elegido)

> Preparada el 2026-11-17. **Todavía no se ha desplegado nada**: el código se adaptó y se probó en local (MySQL y TiDB), pero los pasos de Vercel de esta guía se confirman al hacerlos. Lo que no se pudo comprobar está marcado con ⚠️.

## Qué se publica y dónde

```
Navegador ──► Vercel: página (frontend)  ──https──►  Vercel: API (backend Express)  ──TLS──►  TiDB Cloud (MySQL)
                                                              └──► Gmail (SMTP, puerto 587)
```

| Pieza | Servicio | Costo |
|---|---|---|
| Página (`frontend/`) | Vercel, proyecto **urbify-web** | 0 (plan Hobby, solo uso no comercial) |
| API (`backend/`) | Vercel, proyecto **urbify-api** | 0 |
| Base de datos | TiDB Cloud Starter | 0 (sin tarjeta; cuota gratis) |
| Correos | Gmail con contraseña de aplicación | 0 (Vercel no bloquea el puerto 587) |

Los datos viven en **TiDB**, no en Vercel: cambiar de cuenta de Vercel o de hosting no pierde información (ver "Cambios futuros").

## Qué se adaptó en el código (ya en el repositorio)

- `backend/src/index.js` **exporta la app** y solo abre el puerto cuando se ejecuta directamente (Docker, `npm start`). Vercel la importa.
- `DB_POOL_SIZE`: conexiones por instancia. En Vercel cada instancia abre su propio pool: usar **3**.
- **Avisos en vivo (SSE) apagados** en Vercel (`AVISOS_EN_VIVO`): una conexión larga se cortaría y se reabriría sin parar. La web actualiza las notificaciones **cada 30 segundos**.
- Los correos que se envían **después** de responder (código de verificación, recuperar contraseña) usan `waitUntil` de `@vercel/functions`, para que Vercel no congele la función antes de enviarlos.
- Conexión cifrada a la base (`DB_SSL=true`) y reservas sin choques también en TiDB (`READ COMMITTED`).

## Límites que hay que conocer

- **Límites de peticiones:** viven en la memoria de cada instancia; en Vercel pueden haber varias, así que son **más débiles** que con un solo servidor. Los límites por cuenta/correo y los códigos con intentos siguen protegiendo lo crítico.
- **La primera petición tras un rato sin uso puede tardar** (arranque en frío).
- ⚠️ El tiempo máximo de cada petición lo decide Vercel según el plan (en su documentación hay valores distintos: verificarlo).
- ⚠️ TiDB Starter: la cuota gratis (5 GiB por instancia, según su documentación) y qué pasa con instancias inactivas hay que **confirmarlo en su panel**.

## Antes de empezar

- Cuenta de **Vercel** (vercel.com/signup) y de **TiDB Cloud** con la instancia `urbify` ya creada.
- Node.js instalado en el computador desde el que se despliega (o usar `npx`).
- Una **contraseña de aplicación de Gmail** vigente de la cuenta de Urbify (nunca la contraseña normal).
- Un `JWT_SECRET` nuevo y largo (guárdalo: **no debe cambiar** entre despliegues o se cierran todas las sesiones):

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Paso 1. Preparar la base de datos (una sola vez)

Desde la carpeta `backend`, con las variables de TiDB (host, puerto 4000, usuario con prefijo, contraseña) y `DB_SSL=true`, `DB_NAME=urbify_db`:

```
npm run migrate
ADMIN_EMAIL=admin@tucorreo.com ADMIN_PASSWORD='una-clave-larga' npm run create-admin
```

`migrate` crea las tablas (se puede repetir sin riesgo). `create-admin` crea el administrador con el correo ya verificado.

## Paso 2. Publicar la API (`urbify-api`)

```
cd backend
npx vercel login
npx vercel link          # crear un proyecto nuevo: urbify-api
```

Variables de entorno (en el panel *Settings → Environment Variables* de Vercel, entorno **Production**, o con `npx vercel env add NOMBRE production`). **Nunca en Git:**

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | los de TiDB (puerto `4000`) |
| `DB_NAME` | `urbify_db` |
| `DB_SSL` | `true` |
| `DB_POOL_SIZE` | `3` |
| `JWT_SECRET` | el generado arriba (48+ caracteres) |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | la dirección exacta de la página, con `https` y sin `/` final (ver paso 3; se puede completar después) |
| `EMAIL_FROM` | `Urbify <notificaciones@urbify.app>` (obligatoria en producción; con Gmail el remitente real es la cuenta de Gmail) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | la cuenta de Urbify y su contraseña de aplicación |
| `TRUST_PROXY` | `1` |
| `FORCE_HTTPS` | `true` |

Luego:

```
npx vercel --prod
```

Comprobar: `https://<direccion-de-la-api>/api/health?deep=1` debe responder `200` con `"db":"ok"`.

⚠️ Si Vercel no detecta la app, la causa más probable es el archivo de entrada (`src/index.js`). Su documentación de Express indica los nombres reconocidos; se ajusta con un `backend/vercel.json`.
⚠️ Si la API responde pero la base da error: en TiDB comprobar que la conexión pública permite cualquier IP (Vercel no tiene IP fija).

## Paso 3. Publicar la página (`urbify-web`)

```
cd frontend
npx vercel link          # proyecto nuevo: urbify-web
npx vercel env add VITE_API_URL production    # valor: https://<direccion-de-la-api>/api
```

`VITE_API_URL` se incrusta **al compilar**: si cambia, hay que volver a desplegar. Antes de publicar, en `frontend/vercel.json` reemplazar `https://REEMPLAZA-POR-LA-URL-DEL-BACKEND` por la dirección de la API (sin `/api`), o el navegador bloqueará las llamadas.

```
npx vercel --prod
```

Después, volver al proyecto de la API y poner en `CORS_ORIGIN` la dirección de la página, y volver a desplegar la API (`npx vercel --prod`).

## Paso 4. Lista de comprobación

- [ ] `/api/health?deep=1` responde 200 con `"db":"ok"`.
- [ ] La página carga y la búsqueda muestra servicios.
- [ ] Registrarse con un **correo real**: llega el código (revisar spam) y se entra.
- [ ] "¿Olvidaste tu contraseña?" envía el código.
- [ ] Iniciar sesión como cliente, como proveedor y como administrador; cambiar de modo.
- [ ] La consola del navegador no muestra errores de CORS ni de política de seguridad.
- [ ] Las notificaciones se actualizan (cada 30 s).

## Cambios futuros (cuenta, hosting o base)

- **Cambiar de cuenta de Vercel o de hosting del backend:** no se pierden datos (están en TiDB). Se vuelve a desplegar con las **mismas variables**. La dirección `.vercel.app` cambia: actualizar `VITE_API_URL`, `CORS_ORIGIN`, la política de `frontend/vercel.json` y la app móvil.
- **Mantener siempre el mismo `JWT_SECRET`.** Si cambia, todas las sesiones y los códigos pendientes dejan de servir (no se pierden datos).
- **Cambiar de base de datos:** primero una copia (`mysqldump`) y luego importarla en la base nueva.
- **Copia de seguridad** antes de la presentación y antes de cualquier cambio:

```
mysqldump -h <host-tidb> -P 4000 -u <usuario> -p --ssl-mode=VERIFY_IDENTITY urbify_db > copia-urbify.sql
```

⚠️ Opciones del comando según la versión de `mysqldump` instalada.

## Seguridad

Secretos solo en las variables de Vercel (o en archivos fuera del repositorio), `CORS_ORIGIN` con direcciones exactas (nunca `*`), `DB_SSL=true`, cuenta de Gmail exclusiva de Urbify y contraseña de aplicación revocable. Más detalles en `docs/DESPLIEGUE.md`.

## Estado del despliegue (2026-11-17)

Publicado con la línea de comandos de Vercel, desde la cuenta **Urbify (Hobby)**:

| Pieza | Dirección |
|---|---|
| Página | https://urbify-web-gamma.vercel.app (el nombre `urbify-web` ya estaba tomado, por eso lleva `-gamma`) |
| API | https://urbify-api.vercel.app (`/api/health?deep=1` responde `db: ok`) |
| Base de datos | TiDB Cloud Starter, base `urbify_db` (tablas creadas con `npm run migrate`) |

- `CORS_ORIGIN` de la API = `https://urbify-web-gamma.vercel.app`. Si cambia la dirección de la página, hay que cambiarla allí y volver a desplegar la API.
- `frontend/vercel.json` y `frontend/.env.production` ya traen la dirección de la API.
- Las variables viven en el panel de Vercel (las sensibles, como la clave de TiDB, el `JWT_SECRET` y la contraseña de Gmail, no se pueden volver a leer). Los valores originales están en archivos **fuera del repositorio**.
- Comprobado: la página responde con sus cabeceras de seguridad, la API acepta el origen de la página y rechaza otros, el administrador inicia sesión, la búsqueda y las categorías leen de TiDB y el registro responde 202.
- ⚠️ Falta confirmar con una persona real: que llegue el correo del código de verificación y el de recuperar contraseña desde Vercel, y probar cada pantalla.
