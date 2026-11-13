# Guía de despliegue de Urbify (Vercel + backend + MySQL)

> Preparada el 2026-11-12. Los precios y límites de los servicios cambian: **verifícalos en la página oficial antes de contratar** (se marca cada dato dudoso).

## Respuesta corta

**Vercel solo publica la página (frontend).** Para mostrar Urbify completo también hacen falta un **servidor para el backend**, una **base MySQL** y un **servicio de correo que funcione desde ese servidor**. Con Vercel solo no se puede mostrar la página completa: sin backend no hay login, búsqueda ni solicitudes.

```
Navegador ──► Vercel (frontend React)  ──https──►  Backend Express ──► MySQL
                                                        │
                                                        └──► Correo (Gmail SMTP o Resend por HTTPS)
```

| Pieza | Dónde | Costo orientativo |
|---|---|---|
| Frontend (React/Vite) | **Vercel** (plan Hobby, solo uso no comercial) | 0 |
| Backend (Node/Express) | Railway, Render, Fly o un VPS pequeño | 0 a ~7 USD/mes (ver "Correo") |
| MySQL | El mismo proveedor del backend, o uno gestionado | ~0 a 5 USD/mes (verificar) |
| Dominio (opcional pero recomendado) | Porkbun, Cloudflare… | ~11 USD/año |
| HTTPS | Automático en Vercel y en los hostings anteriores | 0 |

## ⚠️ Lo más importante: el correo y los hostings gratis

La verificación de correo envía un código por correo. Hay dos formas de enviarlo, y **no todas funcionan en todos los servidores**:

| Proveedor | Cómo envía | Funciona en hosting gratis | Notas |
|---|---|---|---|
| **Gmail** (`GMAIL_USER` + `GMAIL_APP_PASSWORD`) | SMTP, puerto 587 | **No siempre.** Render bloquea los puertos SMTP (25, 465 y 587) en sus servicios gratis; Railway también ha tenido bloqueos (verificar) | Gratis, llega a cualquier correo. Funciona desde tu computador o un VPS |
| **Resend** (`RESEND_API_KEY`) | API por HTTPS (puerto 443) | **Sí**, no depende de puertos SMTP | Para enviar a cualquier dirección exige **un dominio propio verificado** (~11 USD/año) |

Opciones reales:

1. **Presentar con el backend en tu computador** (Docker) y exponerlo con un túnel gratis (por ejemplo Cloudflare Tunnel). El frontend va en Vercel. Gmail funciona desde ahí. Costo: 0. Desventaja: tu computador debe estar encendido y con internet durante la presentación.
2. **Backend en un hosting de pago bajo (~5–7 USD/mes) + Gmail** (comprobar antes que el proveedor deja salir el puerto 587).
3. **Backend en un hosting + Resend con dominio**. Es la más estable y la más "de verdad" (HTTPS, sin puertos bloqueados).

> En Windows, el antivirus **Norton** intercepta el correo SMTP y Node no confía en su certificado. Si presentan desde un computador con Norton, desactiven un momento la protección de correo o configuren su certificado raíz en `NODE_EXTRA_CA_CERTS`.

## 1. Frontend en Vercel

La app usa `HashRouter` (`/#/buscar`), así que **no hace falta ninguna regla de reescritura**.

1. En vercel.com: *Add New → Project* → importar el repositorio de GitHub.
2. **Root Directory:** `frontend`. Framework: *Vite* (se detecta solo). Build: `npm run build`. Salida: `dist`.
3. **Variable de entorno** (en *Settings → Environment Variables*): `VITE_API_URL` = `https://URL-DEL-BACKEND/api` (con `/api` al final).
   Las variables `VITE_*` se incrustan al **compilar**: si la cambias, hay que volver a desplegar.
4. **Seguridad de cabeceras:** `frontend/vercel.json` (ya incluido) replica las de Nginx, con la política de contenido (CSP).
   **Reemplaza `https://REEMPLAZA-POR-LA-URL-DEL-BACKEND`** por la URL real del backend en la línea `connect-src`. Si no, el navegador bloquea las llamadas a la API (se verá como "error de red").
5. Cada push a `main` vuelve a desplegar solo.

## 2. Backend y MySQL

1. Crear el servicio del backend (carpeta `backend`, comando de arranque `npm start`, Node 20) y una base **MySQL 8**.
2. Variables de entorno del backend (en el panel del proveedor, **nunca en Git**):

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` (exige configuración segura y falla al arrancar si falta algo) |
| `PORT` | el que indique el proveedor (suele inyectarlo) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | los de la base creada |
| `DB_SSL` | `true` si la base exige conexión cifrada (casi todas las gestionadas). El certificado siempre se verifica |
| `JWT_SECRET` | 48+ caracteres aleatorios: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CORS_ORIGIN` | la URL exacta de Vercel, con `https` y sin `/` final (ej. `https://urbify.vercel.app`). Si usan dominio propio, agréguenlo separado por coma |
| `EMAIL_FROM` | `Urbify <notificaciones@tu-dominio.com>` (obligatoria en producción; con Gmail se envía desde la cuenta de Gmail) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | si usan Gmail (ver arriba) |
| `RESEND_API_KEY` | si usan Resend |
| `TRUST_PROXY` | número de proxys delante de la API (en Railway/Render normalmente `1`) |
| `FORCE_HTTPS` | `true` (requiere `TRUST_PROXY` ≥ 1) |

3. **Crear las tablas:** ejecutar una vez `npm run migrate` en el servidor (o como comando previo al arranque). Es idempotente: se puede repetir.
4. **Crear el administrador:** `ADMIN_EMAIL=... ADMIN_PASSWORD='una-clave-larga' npm run create-admin` (el admin nace con el correo verificado).
5. Comprobar: `https://URL-DEL-BACKEND/api/health?deep=1` debe responder `200`.

## 3. Lista de comprobación antes de mostrarla

- [ ] `https://URL-DEL-BACKEND/api/health?deep=1` responde 200 (backend y base conectados).
- [ ] La página de Vercel carga y la búsqueda muestra servicios.
- [ ] Registrarse con un **correo personal real**: llega el código (revisar spam), se escribe y se entra.
- [ ] Iniciar sesión como cliente y como proveedor; crear una solicitud.
- [ ] Iniciar sesión como admin.
- [ ] La consola del navegador no muestra errores de CORS ni de CSP.
- [ ] Ningún secreto aparece en Git (`.env` está en `.gitignore`).

## 4. Seguridad al desplegar

- Secretos solo como variables de entorno del proveedor. Si una clave se filtra (por ejemplo `GMAIL_APP_PASSWORD`), se revoca en Google y se genera otra.
- `CORS_ORIGIN` con orígenes exactos, nunca `*`.
- `NODE_ENV=production`, `FORCE_HTTPS=true` y `TRUST_PROXY` correcto: sin esto los límites de peticiones y el HTTPS no funcionan bien detrás de un proxy.
- `DB_SSL=true` con la base gestionada: la contraseña de MySQL no debe viajar sin cifrar.
- Usar una cuenta de Gmail **solo para Urbify**, no una personal.
- Hacer una copia de seguridad de la base antes de la presentación.

## 5. Costos y límites a verificar (consultados el 2026-11-12)

- **Vercel Hobby:** solo uso personal y no comercial. Para cobrar a usuarios reales hay que pasar a Pro. Las variables `VITE_*` solo se leen al compilar.
- **Render (gratis):** el servicio se duerme tras 15 minutos sin tráfico (la primera petición tarda cerca de 1 minuto) y **bloquea el SMTP**. Para quitar el bloqueo hay que pasar a un plan de pago (~7 USD/mes). Fuente: changelog de Render sobre puertos SMTP.
- **MySQL gratis:** Aiven retiró su plan gratuito de MySQL; PlanetScale y Railway tienen información contradictoria. **Confirmar en sus páginas de precios** antes de decidir.
- **Dominio:** ~10–11 USD al año; es **pago anual**, no único.

## 6. Pendiente de decidir por el equipo

- [ ] ¿Presentan con el backend local + túnel, o contratan hosting (~5–7 USD/mes)?
- [ ] ¿Compran el dominio (~11 USD/año)? Habilita Resend y da una dirección profesional.
- [ ] ¿Quién guarda la contraseña de aplicación de Gmail y quién tiene acceso a Vercel y al hosting?
- [ ] La **app móvil** debe adaptarse al nuevo registro con código (`POST /auth/registro` ahora responde 202 sin token) y apuntar a la URL del backend desplegado.
