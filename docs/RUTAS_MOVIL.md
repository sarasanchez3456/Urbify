# Rutas que usa la app móvil (issue #13)

`ApiService.kt` de Urbify-Mobile llamaba tres rutas que el backend no tenía. Decisión:

| Ruta | Decisión | Estado |
|---|---|---|
| `POST /api/auth/olvido-contrasena` | **Implementada** | Disponible |
| `POST /api/auth/restablecer-contrasena` | **Implementada** | Disponible |
| `POST /api/auth/refresh` | **Retirada** (no se implementa) | La app móvil debe dejar de llamarla |

## Recuperación de contraseña

Contrato (coincide con `OlvidoContrasenaRequest` / `RestablecerContrasenaRequest` de la app):

```
POST /api/auth/olvido-contrasena
{ "correo": "ana@ejemplo.com" }
→ 200 { "mensaje": "Si el correo está registrado, recibirás un código ..." }
→ 400 si el correo no tiene formato válido
→ 429 si se supera el límite de solicitudes

POST /api/auth/restablecer-contrasena
{ "correo": "ana@ejemplo.com", "codigo": "123456", "nueva_contrasena": "..." }
→ 200 { "mensaje": "Contraseña actualizada. ..." }
→ 400 { "error": "Código inválido o expirado" }  (también para código incorrecto o correo sin código)
→ 400 si la contraseña no tiene entre 8 y 72 caracteres
→ 429 si se supera el límite
```

Reglas:

- El código tiene 6 dígitos, se genera con `crypto.randomInt`, se envía por correo (Resend) y **solo se guarda su hash** en `recuperaciones_contrasena`.
- Vence a los **15 minutos**, sirve **una sola vez** y se invalida tras **5 intentos fallidos**. Pedir otro código invalida el anterior.
- `olvido-contrasena` responde igual exista o no la cuenta (y antes de enviar el correo) para no revelar qué correos están registrados.
- Al restablecer se **cierran todas las sesiones** de la cuenta (`tokens_sesion`).
- Límites por hora (configurables, ver README): olvido 10 por IP y 3 por correo; restablecer el triple.
- Bases de datos existentes: ejecutar `npm run migrate` (crea la tabla nueva).

> **Requisito para el Acta:** la recuperación de contraseña es un requisito nuevo que no estaba en el Acta de Constitución; hay que agregarlo.

## Renovación de token (`/auth/refresh`): retirada

El JWT dura 7 días y es revocable en el servidor (logout borra el token de `tokens_sesion`). Cuando vence, el usuario inicia sesión de nuevo; es la misma decisión que la web (`docs/AUTENTICACION_WEB.md`). Un refresh simple tendría que decidir si rota el token o lo alarga, y no aporta seguridad sobre el login actual.

### Texto sugerido para el issue en Urbify-Mobile

> **Título:** Retirar la llamada a `POST /api/auth/refresh`
>
> El backend no implementa `/api/auth/refresh` y no se va a implementar (el JWT dura 7 días y se revoca en el servidor; ver `docs/RUTAS_MOVIL.md` en Urbify). Pendiente en la app: quitar `refresh()` y `RefreshResponse` de `ApiService.kt`, y ante un `401` en rutas protegidas cerrar la sesión y volver al login (no en `/auth/login`). Además, al cerrar sesión llamar a `POST /api/auth/logout` antes de borrar el token local. Las rutas `olvido-contrasena` y `restablecer-contrasena` ya existen con el contrato indicado en este documento.
>
> Relacionado: Urbify #13 y #5.
