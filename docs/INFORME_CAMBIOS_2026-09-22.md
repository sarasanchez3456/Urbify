# Informe de cambios — 22 de septiembre de 2026

## Alcance

Se integraron los repositorios **Urbify** (API/MySQL) y **Urbify-Mobile** (Android con Jetpack Compose) para completar el flujo de publicación, solicitud programada, seguimiento y conversación.

## Backend y base de datos

- Se normalizaron los campos opcionales al crear y editar servicios, evitando fallos de MySQL cuando el cliente omite `descripcion` o `tarifa`.
- Un servicio que ya recibió una calificación no se puede eliminar; la API responde HTTP 409 con un mensaje específico.
- Al crear una solicitud, el proveedor se obtiene desde el servicio almacenado; no se confía en un proveedor enviado por el cliente.
- La fecha y hora de servicio es obligatoria y debe ser futura.
- Cada solicitud guarda `tarifa_acordada` y `tipo_tarifa_acordada`; los listados usan esa copia para que una tarifa posterior no altere la billetera ni el historial.
- Se añadieron los endpoints autenticados de conversación por solicitud y la tabla `mensajes_solicitud`, con claves foráneas e índice por solicitud/fecha.
- Se actualizaron los dos esquemas SQL y se añadió una migración idempotente para instalaciones existentes.
- Se documentaron Docker, XAMPP y ejemplos de entorno sin secretos reales.

## Aplicación móvil

- El formulario de solicitud exige seleccionar fecha y hora con los diálogos nativos de Android.
- Tras aceptar el proveedor, cliente y proveedor ven días, horas y minutos restantes desde el detalle.
- La cita se muestra en `America/Bogota`; se corrigió el desfase que aparecía porque el emulador estaba en GMT.
- Se implementó un chat vinculado a la solicitud, con burbujas, carga del historial y envío de mensajes.
- La navegación del chat usa Navigation Compose (`NavHost`, `composable` y `chat_solicitud/{solicitudId}`).
- Los errores HTTP muestran el mensaje estructurado de la API, incluido el caso de servicio con reseña.

## Datos locales aplicados

Se verificó MySQL en XAMPP y se ejecutó la migración desde `backend/`. Se confirmó la existencia de las columnas de tarifa histórica y de `mensajes_solicitud`. También se registraron categorías iniciales en la instancia de desarrollo.

## Validaciones realizadas

- `node --check src/controllers/solicitudes.controller.js`
- `node --check src/scripts/migrate.js`
- Consulta de columnas y tablas de MySQL.
- `:app:assembleDevelopmentDebug` de Urbify-Mobile.
- Instalación de la APK de desarrollo y conexión al backend por ADB reverse en el puerto 4000.

## Operación recomendada

1. Después de actualizar el backend, ejecuta `npm run migrate` desde `backend/`.
2. Inicia la API con `npm run dev`.
3. Para Android emulador usa `10.0.2.2:4000` o `adb reverse tcp:4000 tcp:4000` cuando se compile contra `127.0.0.1`.
4. Mantén los dos repositorios actualizados: el móvil consume directamente el contrato de esta API.
