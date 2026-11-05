# Autenticación del frontend web

Decisión del issue #4. Complementa `docs/AUTORIZACION.md` (permisos) y el README (endpoints).

## Estrategia de almacenamiento: JWT en `localStorage` (se mantiene), con mitigaciones

Se evaluó mover el JWT a una cookie `HttpOnly; Secure; SameSite`. **No se adopta ahora**, por estas razones:

| Factor | Cookie HttpOnly | Bearer en `localStorage` (actual) |
|---|---|---|
| Despliegues | La web se publica en GitHub Pages (`*.github.io`) y la API en otro dominio: cookie de terceros (`SameSite=None`), bloqueada por defecto en Safari/Firefox y en retroceso en Chrome. | Funciona igual en Pages, Docker/Nginx y desarrollo. |
| App móvil | Necesita seguir usando `Authorization: Bearer`; habría que mantener **dos** mecanismos en el backend. | Un único mecanismo para web y móvil. |
| CSRF | Aparece y exige token anti-CSRF y control estricto de `Origin`. | No aplica (el navegador no adjunta el token solo). |
| Robo por XSS | No se puede leer el token (pero el atacante igual puede hacer peticiones desde la página). | Un XSS puede leerlo. |

El riesgo residual es XSS. Se reduce con: `helmet`/CSP en la API (#3), React escapando por defecto, sesiones **revocables en el servidor** (cada token vive en `tokens_sesion`; logout lo borra) y expiración de 7 días. **Revisar la decisión** si la web y la API pasan a servirse bajo el mismo sitio (p. ej. `app.urbify.app` y `api.urbify.app`) y se unifica el mecanismo con la app móvil.

## Qué se guarda en el navegador

- Solo el token, en `localStorage['token']` (`frontend/src/api/session.js`).
- Los datos del usuario **ya no se persisten**: viven en memoria (`AuthContext`) y se piden con `GET /api/auth/perfil` al recargar. La clave antigua `usuario` se elimina en cada login/logout.

## Ciclo de vida de la sesión

| Evento | Comportamiento |
|---|---|
| Login / registro | Se guarda el token; el usuario queda en memoria. |
| Recarga | Si hay token vigente, se restaura con `/auth/perfil`. Sin token o con token vencido (claim `exp`) se limpia y no se llama a la API. Un error de red conserva la sesión. |
| Logout | Se limpia el token local de inmediato y se llama a `POST /api/auth/logout` para revocarlo en el servidor (si falla la red, la sesión local queda cerrada igual). |
| Token vencido | Un temporizador (y la vuelta a la pestaña visible) cierra la sesión local al llegar a `exp`. Las peticiones salen sin token y las rutas protegidas devuelven 401. |
| `401` | Si el token rechazado sigue siendo el actual: se limpia la sesión, se olvida al usuario y se redirige a `/login`. Un `401` de `/auth/login` o `/auth/registro` (credenciales incorrectas) no cierra la sesión. |
| Varias pestañas | Evento `storage`: el logout, la expiración o el login en una pestaña se reflejan en las demás. |

Protección contra bucles: tras limpiar el token, las peticiones siguientes ya no llevan `Authorization`, así que no vuelven a disparar el manejo de `401`; y una respuesta tardía de un token anterior no cierra un inicio de sesión nuevo.

## Refresh de tokens

No hay refresh token: el JWT dura 7 días (`JWT_EXPIRES_IN`) y se revoca borrándolo de `tokens_sesion`. Al vencer, el usuario inicia sesión de nuevo. Añadir refresh tokens queda fuera de este issue.

## Para Urbify-Mobile

Usar el mismo contrato: `Authorization: Bearer <token>`, `POST /api/auth/logout` para revocar, y tratar `401` en rutas protegidas como sesión terminada (no en `/auth/login`).

## Pruebas

Las pruebas automatizadas (recarga, varias pestañas, `401`) quedan para el issue #7 (marco de pruebas y CI). Se verificó manualmente la lectura de `exp`, la limpieza de la clave antigua y el aviso interno de fin de sesión con un script de Node; `npm run build` pasa.
