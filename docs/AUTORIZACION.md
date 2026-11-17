# Autorización en la API de Urbify

Resultado de la auditoría del issue #2. Describe quién puede hacer qué y qué código HTTP recibe cuando no puede.

## Códigos HTTP

| Código | Cuándo |
|---|---|
| `401` | Sin token, token inválido/expirado/cerrado, o cuenta desactivada. |
| `403` | Sesión válida pero sin permiso: el rol no está permitido en la ruta, o el recurso existe y pertenece a otro usuario. |
| `404` | El recurso no existe. |
| `400` | Datos inválidos o acción no válida en el estado actual (p. ej. calificar una solicitud no completada). |
| `409` | Conflicto con el estado actual (p. ej. solicitud ya calificada, cambio de estado simultáneo, borrado con dependencias). |

## Sesión, rol histórico y modo activo

- `rol` se conserva por compatibilidad e historial de la cuenta (`cliente`, `proveedor`, `admin`); no decide por sí solo los permisos de una cuenta no administrativa.
- `es_proveedor` expresa la capacidad permanente de operar como proveedor. Una cuenta no administrativa conserva siempre la capacidad de operar como cliente.
- `tokens_sesion.modo_activo` (`cliente` o `proveedor`) es el modo efectivo de **esa sesión**: cada dispositivo puede estar en un modo distinto. `usuarios.modo_activo` es el modo con el que empieza el próximo inicio de sesión. Un administrador permanece separado: tiene `es_proveedor = false` y `modo_activo = null` (en la cuenta y en sus sesiones).
- El JWT solo identifica la sesión. `authenticate` valida en cada petición la sesión en `tokens_sesion`, el estado `activo` de la cuenta y que el modo de la sesión sea válido para la cuenta (`proveedor` solo si `es_proveedor`); el JWT no es la fuente autoritativa del modo. `GET /auth/perfil` devuelve el modo de la sesión que hace la petición.
- `authorize` usa el modo efectivo determinado por el servidor. Una ruta exclusiva de proveedor responde `403` en modo cliente, y una exclusiva de cliente responde `403` en modo proveedor.
- Cambiar de modo (#46) reemite el token de esa sesión y deja de valer el anterior; las sesiones de otros dispositivos no se tocan. Una sesión en modo `proveedor` se rechaza con `401` si la cuenta pierde la capacidad `es_proveedor`, de modo que un token antiguo no conserva permisos obsoletos.
- El registro público (`POST /api/auth/registro`) solo acepta `cliente` y `proveedor`.
- **Primer administrador:** `npm run create-admin` en el servidor, con `ADMIN_EMAIL` y `ADMIN_PASSWORD` del entorno. Es la única vía para obtener el rol `admin`; promover a un usuario existente cierra sus sesiones abiertas.
- No hay endpoint para cambiar roles ni para crear administradores. Un administrador no puede eliminar a otro administrador ni a sí mismo desde la API.

## Reglas por recurso

| Recurso | Operación | Quién | Regla de pertenencia |
|---|---|---|---|
| Perfil | leer / actualizar | cualquier usuario autenticado | Solo el propio (`req.usuarioId`); ni rol, ni capacidad ni modo son editables por perfil. |
| Usuarios | listar, ver, eliminar | `admin` | No se puede eliminar a un admin ni a uno mismo; `409` si tiene datos asociados. |
| Categorías | crear, editar, eliminar | `admin` | — |
| Servicios | crear | modo `proveedor` | Se crea siempre a nombre del usuario autenticado; la categoría debe existir. |
| Servicios | editar, eliminar | modo `proveedor` | Solo el dueño (`403` si es de otro, `404` si no existe). |
| Solicitudes | crear | modo `cliente` | El servicio debe estar disponible; no se puede solicitar un servicio propio por identidad (`req.usuarioId`), incluso si la cuenta tiene ambos modos. |
| Solicitudes | crear: proveedor y tarifa | `cliente` | El `proveedor_id` no se recibe: se toma del servicio. Se guarda `tarifa_acordada`. La fecha del servicio es obligatoria y futura. |
| Mensajes de la solicitud | leer, enviar | modo correspondiente a la parte | Solo las dos partes de la solicitud (`403` a terceros o en el modo contrario, `404` si no existe). |
| Solicitudes | listar propias | modo `cliente` / `proveedor` | Solo las propias en el modo activo. |
| Solicitudes | cambiar estado | modo correspondiente a la parte | Solo las partes de la solicitud. Ver transiciones. |
| Solicitudes | eliminar | modo correspondiente a la parte | Solo las partes, y solo en estado `pendiente` o `cancelada`. |
| Calificaciones a proveedor | crear, editar, eliminar | modo `cliente` | Solo el cliente de la solicitud, solicitud `completada`, una sola vez (`UNIQUE(solicitud_id)`), entero 1–5. |
| Calificaciones a cliente | crear | modo `proveedor` | Se guardan en `calificaciones_cliente`, separadas de la reputación recibida como proveedor. |
| Notificaciones | listar, leer, eliminar | autenticado | Solo las propias (`403` si es de otro). Cada una tiene un modo (`cliente` o `proveedor`, según el papel del destinatario en la solicitud) o ninguno (general): una cuenta con los dos modos solo ve, marca y borra las de su modo actual y las generales; una del otro modo responde `404`. El administrador, sin modo, ve todas las suyas. |

### Transiciones de solicitudes

| Estado actual | Proveedor puede pasar a | Cliente puede pasar a |
|---|---|---|
| `pendiente` | `aceptada`, `cancelada` | `cancelada` |
| `aceptada` | `en_proceso`, `cancelada` | — |
| `en_proceso` | `completada` | — |
| `completada`, `cancelada` | — | — |

El cambio se aplica con `UPDATE ... WHERE estado = <estado leído>`: si otra petición lo cambió entre tanto, responde `409`.

## Pruebas

Las pruebas automatizadas de acceso cruzado (usuario A sobre recursos de B, roles incorrectos) quedan para el issue #7 (pruebas y CI), que define el marco de pruebas.
