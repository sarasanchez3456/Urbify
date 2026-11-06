# Guía de revisión y fusión (PRs #16 a #30)

Esta guía es para quien revise y fusione la pila de PRs. Se probó la pila completa fusionada en orden sobre `develop` (6-nov-2026): sin conflictos, y el árbol resultante es idéntico al de `fix/qa-hallazgos`.

## 1. Orden exacto de fusión

Las ramas están **apiladas**: cada una contiene a la anterior. Fusiona en este orden y **espera a que cada PR esté en `develop` antes de fusionar el siguiente**.

| Orden | PR | Rama | Base | Qué trae |
|---|---|---|---|---|
| 1 | #16 | `feature/11-unificar-schema` | `develop` | Un solo `schema.sql` |
| 2 | #17 | `feature/8-rol-admin` | `develop` | Rol `admin` en el esquema |
| 3 | #18 | `feature/2-auditoria-autorizacion` | `develop` | Auditoría de autorización por recurso y gestión del rol admin (`create-admin`) |
| 4 | #19 | `feature/10-stats-admin` | `develop` | `/stats/admin` |
| 5 | #20 | `feature/9-logout` | `develop` | `POST /auth/logout` |
| 6 | #21 | `feature/3-secretos-produccion` | `develop` | Secretos por entorno, validación de `env` |
| 7 | #22 | `feature/6-rate-limiting` | `develop` | Rate limiting |
| 8 | #23 | `feature/4-auth-frontend` | `develop` | Autenticación en el frontend web |
| 9 | #24 | `feature/13-rutas-movil` | `develop` | Recuperación de contraseña, rutas para la app móvil |
| 10 | #25 | `feature/12-chat-solicitudes` | `develop` | Chat por solicitud, `fecha_servicio` obligatoria |
| 11 | #26 | `feature/5-openapi` | `develop` | `docs/openapi.yaml` |
| 12 | #27 | `feature/14-panel-admin` | `develop` | Panel de administración |
| 13 | #28 | `feature/15-verificacion-hito2` | `develop` | Verificación del Hito 2, ajustes de revisión |
| 14 | #29 | `fix/validar-telefono` | `feature/15-verificacion-hito2` | Validación del teléfono |
| 15 | #30 | `fix/qa-hallazgos` | `fix/validar-telefono` | Correcciones del QA |

### Cómo fusionar (importante)

- **No uses "Squash and merge" en los apilados.** Usa **"Create a merge commit"** (o "Rebase and merge"). Con squash, la rama siguiente sigue conteniendo los commits originales de la anterior y se llena de conflictos. Se comprobó: tras hacer squash de #16, fusionar #17 da conflicto en `backend/src/config/schema.sql` y `backend/src/scripts/migrate.js`.
- Si alguien ya usó squash, la siguiente rama se arregla con rebase sobre `develop`, sin tocar los commits anteriores:

```bash
git fetch origin
git checkout feature/8-rol-admin
git rebase --onto origin/develop origin/feature/11-unificar-schema
git push --force-with-lease
```

  (`origin/feature/11-unificar-schema` es el último commit de la rama anterior). Hay que repetirlo para cada rama que quede por fusionar.
- **#29 y #30 no apuntan a `develop`.** #29 apunta a `feature/15-verificacion-hito2` y #30 a `fix/validar-telefono`. **No borres las ramas hasta el final**: si #28 se fusiona y su rama se borra, GitHub reorienta #29 a `develop` automáticamente; si no se borra, cambia la base de #29 a `develop` a mano (y después la de #30), y comprueba que el diff solo muestra los commits propios.
- Antes de cada fusión, comprueba que el PR muestra solo sus propios commits (columna "Qué trae").

## 2. Qué revisar con más cuidado

- **Schema y migración (#16, #17, #25, #24):**
  - `backend/src/config/schema.sql` es la única fuente (Docker la carga al crear el volumen y `npm run migrate` la aplica de nuevo).
  - `migrate.js` convierte `usuarios.rol` de ENUM a `VARCHAR(20)` si la base es antigua; es idempotente.
  - Probado: base del `schema.sql` de `develop` + `migrate` conserva todos los datos y deja la estructura idéntica a una base nueva. Las bases del antiguo `scripts/schema.sql` migran y funcionan, pero conservan columnas más anchas y les faltan algunos CHECK/FK.
  - Al sembrar categorías, `INSERT IGNORE` por id: si una base tiene categorías propias en los ids 1 a 8, se respetan y no se pisan.
- **Logout (#20, QA-01 en #30):** el token se elimina de `tokens_sesion` y `authenticate` exige esa fila. Revisa que la web llame a `/auth/logout` sin cuerpo (axios mandaba `null` y el servidor devolvía 400).
- **Rate limiting (#22):**
  - Límites por IP, por cuenta+IP y por cuenta (login), registro, recuperación y público.
  - Con nginx delante hace falta `TRUST_PROXY=1` (el compose ya lo pone); con la API expuesta directamente, `TRUST_PROXY=0`.
  - Un login **correcto** de una cuenta bloqueada también recibe 429 (diseño elegido).
- **Recuperación de contraseña (#24):** código de 6 dígitos guardado como hash, 15 min, 5 intentos, respuesta genérica, cierra todas las sesiones al restablecer. Sin `RESEND_API_KEY` no sale ningún correo: no se puede completar el flujo.
- **Validación central con ajv (#30):**
  - Esquemas en `backend/src/validation/schemas.js`, con los mismos límites que `docs/openapi.yaml`.
  - El manejador global `middleware/errorHandler.js` traduce errores de MySQL a 400/409.
  - Revisa que ningún controlador devuelva 500 por entrada del usuario.
  - Nueva dependencia directa: `ajv`.
- **Privacidad de contacto (#30, QA-11):**
  - Teléfono, dirección y coordenadas exactas solo para `cliente` y `admin`.
  - `authenticateOptional` trata un token inválido o vencido como anónimo.
  - Revisa `backend/src/utils/privacidad.js` y que cada endpoint de la lista de la sección 5 lo use.
  - Riesgo conocido: variando punto y radio en `/proveedores/cercanos` se puede acotar la ubicación real; lo frena el límite de 120/min por IP.
- **bcrypt en workers (#30, QA-09):** `utils/passwordHasher.js`; si los workers no arrancan, usa bcryptjs en el hilo principal y lo registra en el log.
- **Fechas (#25, #28):**
  - `fecha_servicio` obligatoria y futura.
  - Se guarda en UTC; una fecha sin zona se toma como hora de Colombia (-05:00).
  - El correo muestra la hora de `America/Bogota`.

## 3. Pruebas manuales después de fusionar

Con la pila ya en `develop`, desde la raíz del repo:

```bash
cp .env.example .env   # rellena DB_PASSWORD y JWT_SECRET (ver el archivo)
docker compose up --build
```

1. Abre http://localhost y comprueba que carga sin errores en la consola del navegador.
2. **Registro:** un cliente y un proveedor (con teléfono `+57 300 123 4567`; debe guardarse como `+573001234567`). Un teléfono con letras debe dar error.
3. **Login** y **logout** por la interfaz; después, con el token viejo, `GET /api/auth/perfil` debe dar 401.
4. **Recuperar contraseña:** pide el código y restablece. Requiere `RESEND_API_KEY` y un dominio verificado; sin eso, solo se puede comprobar que la respuesta es genérica.
5. **Mapa:**
   - Sin sesión carga y muestra proveedores, sin teléfono ni dirección.
   - Con un cliente, la ficha del servicio muestra el contacto exacto.
6. **Panel de admin:** crea un admin con `docker compose exec -e ADMIN_EMAIL=admin@ejemplo.com -e ADMIN_PASSWORD='una-clave-larga' backend npm run create-admin`; inicia sesión y revisa estadísticas y usuarios. Un cliente no debe poder entrar (403).
7. **Solicitar servicio con fecha de dentro de una hora** (un cliente sobre un servicio de un proveedor): debe crearse, y una fecha pasada debe rechazarse.
8. Repite el registro de más de 10 cuentas desde la misma IP en una hora: debe aparecer el mensaje de límite (429).

## 4. Qué NO está probado y quién debe probarlo

| Qué | Estado | Quién |
|---|---|---|
| `docker compose up --build` completo | **Probado** (Docker Desktop en Windows, `node:20-alpine`, `nginx:1.25-alpine`, `mysql:8.0` = 8.0.46): arranca, humo de API y UI OK. No probado en Linux/macOS ni con ARM | Quien use Linux o macOS |
| Pool de workers de bcrypt en Alpine | **Probado** (retraso del event loop 3 ms frente a 3 594 ms sin workers, y respaldo forzado) | — |
| App móvil Android (Urbify-Mobile) | **No probado** | Responsable de Urbify-Mobile |
| MySQL 8.0.16 (versión mínima del schema) | **No probado** (solo 8.0.40 y 8.0.46) | Quien tenga ese servidor |
| Resend real (dominio verificado, entrega, formato del correo) | **No probado** (el envío se simuló) | Quien administre Resend |
| Firefox, Safari, móviles | **No probado** (solo Chrome) | Cualquiera del equipo |
| Datos reales antiguos (D-04) | **No probado** | Ver sección 5 |

## 5. Pendientes que necesitan decisión del equipo

- **`VITE_API_URL` real (QA-23):** `frontend/.env.production` sigue con `https://TU-BACKEND-URL/api`. `npm run deploy` se cancela mientras no se cambie. En Docker no afecta (usa `/api`).
- **Dominio verificado en Resend:** sin él, `EMAIL_FROM` no puede enviar a cualquier destinatario y la recuperación de contraseña no funciona en producción.
- **D-04 (fechas antiguas):** las filas con `DATETIME` guardadas antes del paso a UTC se interpretan como UTC aunque se escribieron en hora local. Hay que decidir si se migran (restando el desfase) o se dejan.
- **Actualizar `resend` 3→6 y `react-router-dom` 6→7:**
  - Quedan 9 avisos de `npm audit --omit=dev` en el backend (cadena de `resend`) y 2 en el frontend (`react-router`).
  - No son explotables hoy: la app solo pasa `html` a `resend` (nunca `react`) y no usa SSR.
  - Conviene abrir un issue.
- **Aviso a Urbify-Mobile:**
  - Validación con 400 (también para el teléfono) y mensajes de error nuevos.
  - Un id de ruta no entero da 404.
  - Sin sesión de cliente, `telefono` y `direccion` no llegan y las coordenadas y `distancia_km` son aproximadas.
  - `/auth/refresh` ya no existe.
  - `GET /api/health?deep=1` es nuevo.
- Dudas D-01 a D-03 del informe de QA (sin cambios).
