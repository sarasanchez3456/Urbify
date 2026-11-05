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

## Sesión y roles

- El rol y el estado `activo` se leen de la base de datos en cada petición (`middleware/auth.js`), no del JWT. Un cambio de rol o una cuenta desactivada surten efecto de inmediato.
- Roles: `cliente`, `proveedor`, `admin`.
- El registro público (`POST /api/auth/registro`) solo acepta `cliente` y `proveedor`.
- **Primer administrador:** `npm run create-admin` en el servidor, con `ADMIN_EMAIL` y `ADMIN_PASSWORD` del entorno. Es la única vía para obtener el rol `admin`; promover a un usuario existente cierra sus sesiones abiertas.
- No hay endpoint para cambiar roles ni para crear administradores. Un administrador no puede eliminar a otro administrador ni a sí mismo desde la API.

## Reglas por recurso

| Recurso | Operación | Quién | Regla de pertenencia |
|---|---|---|---|
| Perfil | leer / actualizar | cualquier usuario autenticado | Solo el propio (`req.usuarioId`); el rol no es editable. |
| Usuarios | listar, ver, eliminar | `admin` | No se puede eliminar a un admin ni a uno mismo; `409` si tiene datos asociados. |
| Categorías | crear, editar, eliminar | `admin` | — |
| Servicios | crear | `proveedor` | Se crea siempre a nombre del usuario autenticado; la categoría debe existir. |
| Servicios | editar, eliminar | `proveedor` | Solo el dueño (`403` si es de otro, `404` si no existe). |
| Solicitudes | crear | `cliente` | El servicio debe pertenecer al proveedor indicado y estar disponible; no a uno mismo. |
| Solicitudes | crear: proveedor y tarifa | `cliente` | El `proveedor_id` no se recibe: se toma del servicio. Se guarda `tarifa_acordada`. La fecha del servicio es obligatoria y futura. |
| Mensajes de la solicitud | leer, enviar | `cliente` / `proveedor` | Solo las dos partes de la solicitud (`403` a terceros, `404` si no existe). |
| Solicitudes | listar propias | `cliente` / `proveedor` | Solo las propias (según rol). |
| Solicitudes | cambiar estado | `cliente` / `proveedor` | Solo las partes de la solicitud. Ver transiciones. |
| Solicitudes | eliminar | `cliente` / `proveedor` | Solo las partes, y solo en estado `pendiente` o `cancelada`. |
| Calificaciones | crear | `cliente` | Solo el cliente de la solicitud, solicitud `completada`, una sola vez (`UNIQUE(solicitud_id)`), entero 1–5. |
| Calificaciones | editar, eliminar | `cliente` | Solo el autor. |
| Notificaciones | listar, leer, eliminar | autenticado | Solo las propias (`403` si es de otro). |

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
