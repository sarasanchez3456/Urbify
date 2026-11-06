# Verificación de la alineación con el Hito 2

Verificación del issue #15 sobre la rama que reúne todos los PRs apilados (#16 a #27). Estados: **Verificado** (comprobado en código y/o ejecutando), **Parcial** (falta algo explícito) y **No verificado** (no se pudo comprobar aquí).

Limitación general: no hubo MySQL ni Docker en el entorno, así que ningún criterio se probó contra una base de datos real. Las comprobaciones fueron lectura de código, `node --check`, `npm run build`, el linter de OpenAPI y scripts desechables con base de datos y correo simulados.

| Issue | Criterio | Estado | Evidencia / pendiente |
|---|---|---|---|
| #8 Rol admin | Un `admin` puede usar `GET /api/auth` y `POST /api/categorias` | Parcial | `chk_usuarios_rol` acepta `admin` y las rutas usan `authorize('admin')`. Falta probarlo con una BD real y `create-admin`. |
| #8 | El registro público no crea admins | Verificado | `registrar` solo acepta `cliente` y `proveedor` (400 en otro caso). |
| #9 Logout | El token cerrado recibe 401 | Parcial | `POST /auth/logout` borra de `tokens_sesion` y `authenticate` exige la fila. Sin prueba end-to-end. Documentada en README y OpenAPI. |
| #10 Estadísticas | Cliente/proveedor 403, admin recibe cifras, home sin sesión | Parcial | `authorize('admin')` en `/stats/admin`; `/stats` sigue pública. Sin BD no se vieron cifras reales. |
| #11 Schema | Un solo `schema.sql`, Docker y migración lo usan | Verificado | `scripts/schema.sql` eliminado; `migrate.js` aplica `config/schema.sql`. "Base nueva = migrada" no se comprobó con MySQL. |
| #12 Chat | Chat contra `develop`, notificaciones siguen | Parcial | Rutas `/:id/mensajes` y notificaciones verificadas con BD simulada. **No probado desde la app móvil.** |
| #13 Rutas móviles | Ninguna pantalla llama rutas inexistentes | Parcial | Recuperación implementada. `POST /auth/refresh` **se retiró del backend pero la app móvil aún la llama**: requiere el cambio en Urbify-Mobile (texto en `docs/RUTAS_MOVIL.md`). |
| #14 Panel admin | Admin ve cifras; cliente/proveedor no entran | Parcial | Ruta `rol="admin"`, build correcto. No probado en navegador. |
| #4 Auth web | Estrategia documentada, token vencido, logout, pestañas | Parcial | Documentado (`AUTENTICACION_WEB.md`), build correcto y helpers verificados con Node. Sin pruebas en navegador ni automatizadas. |
| #7 Pruebas y CI | — | **No hecho** | Fuera de alcance por indicación. Quedan sin cubrir: pruebas negativas de acceso cruzado (#2), de límites (#6), de sesión web (#4) y validación del contrato en CI (#5). |
| Urbify-Mobile #23, #24, #25 | — | No verificado | Otro repositorio; no se tocó. |

## Documentación frente al código

- **Rol admin, estados de la solicitud y tablas:** el código tiene roles `cliente`/`proveedor`/`admin`, estados `pendiente`, `aceptada`, `en_proceso`, `completada`, `cancelada` y las tablas `categorias`, `usuarios`, `servicios`, `solicitudes`, `mensajes_solicitud`, `calificaciones`, `tokens_sesion`, `recuperaciones_contrasena`, `notificaciones`. **Hay que compararlo con los documentos de modelado del Hito 2**, que no están en el repositorio (los `*.pdf` están ignorados); no se pudo hacer aquí.
- **Documentos que dependen del equipo (no editables desde el repo):** agregar como requisitos al Acta de Constitución, al Documento de requerimientos y a las historias de usuario: **chat de solicitudes**, **fecha de servicio obligatoria y futura** y **recuperación de contraseña**; y actualizar las matrices de trazabilidad del Hito 1 con CU-06 a CU-11.
- **Documentación del repo actualizada:** `README.md` (endpoints, variables, límites, administrador), `docs/openapi.yaml`, `docs/AUTORIZACION.md`, `docs/AUTENTICACION_WEB.md`, `docs/RUTAS_MOVIL.md`.
- Discrepancia previa corregida en el README: la ruta de registro es `/api/auth/registro` (la tabla decía `/register`); queda pendiente revisar el resto de la tabla frente al OpenAPI, que es la referencia.

## Decisiones tomadas que conviene registrar

1. Base `develop` creada desde `main` y PRs apilados (sin fusionar).
2. Sesión web con JWT en `localStorage` (no cookie HttpOnly) — `docs/AUTENTICACION_WEB.md`.
3. Se eliminó el bloqueo de cuenta por 3 fallos a favor de límites por IP y cuenta.
4. `POST /auth/refresh` retirada; recuperación de contraseña implementada.
5. Chat unido reaplicando la rama sobre `develop`, no por merge literal.

## Para dar el issue por cerrado

Fusionar los PRs en orden, ejecutar `npm run migrate`, crear un admin con `npm run create-admin`, y recorrer a mano cada fila "Parcial" con la app web y la móvil.
