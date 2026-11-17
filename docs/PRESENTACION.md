# Guía para presentar Urbify (ensayo y día de la presentación)

> Preparada el 2026-11-17. Todo lo de esta guía se probó en un computador con Windows y Docker Desktop, **excepto el túnel de Cloudflare** (ver la sección 6): ese paso no se pudo probar porque `cloudflared` no estaba instalado.

## 1. La idea en una frase

**Se enciende todo Urbify con Docker en un computador (base de datos, servidor y página) y se abre en `http://localhost`.** Si otras personas tienen que entrar desde sus celulares o computadores, se agrega **un solo túnel** que le da a ese mismo computador una dirección `https://...`.

```
Navegador ──► (túnel, opcional) ──► Nginx (página + /api) ──► Backend ──► MySQL
                                   todo corre con "docker compose" en UN computador
```

### Por qué esta opción y no "página en Vercel + backend en Docker"

Antes se pensó en publicar la página en Vercel y apuntarla al backend local con un túnel. Al revisarlo en detalle, **un solo túnel a todo Urbify es mejor para presentar**:

| | Todo en Docker + un túnel (esta guía) | Página en Vercel + backend con túnel |
|---|---|---|
| Direcciones que cambian en cada ensayo | **Ninguna** que haya que configurar | La del túnel cambia cada vez y hay que ponerla en 3 sitios (`VITE_API_URL` en Vercel, la política de seguridad `vercel.json` y `CORS_ORIGIN`) y **volver a desplegar** la página |
| Partes que pueden fallar | Docker y el túnel | Docker, el túnel, Vercel, CORS y la política de seguridad |
| Tiempo para dejarlo listo | Un comando | Varios pasos y esperar el despliegue |
| Sin internet o si falla el túnel | Se sigue en `http://localhost` | No se puede presentar |

Vercel sigue siendo buena idea cuando exista un backend publicado de forma permanente (ver `docs/DESPLIEGUE.md`). Para una presentación, no aporta y agrega riesgos.

## 2. Lo que se necesita

- **Docker Desktop** instalado y encendido (dice "Running").
- El archivo **`.env`** en la carpeta del proyecto (no está en Git; lo entrega quien lo creó). Debe tener `DB_PASSWORD`, `JWT_SECRET` y, para los correos, `GMAIL_USER` y `GMAIL_APP_PASSWORD`. Plantilla: `.env.example`.
- Para que otras personas entren: **`cloudflared`** (túnel gratis de Cloudflare). Ver la sección 6.

## 3. Un comando para levantar todo

Desde la carpeta del proyecto, en PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\presentacion.ps1
```

El script comprueba Docker y el `.env`, levanta todo, espera a que el servidor y la base de datos respondan y avisa qué falla si algo no anda. La primera vez tarda unos minutos.

Para comprobar además que **el código de verificación llega por correo**:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\presentacion.ps1 -ProbarCorreo tu.correo@gmail.com
```

Registra una cuenta de ensayo con ese correo; debe llegar `XXXXXX es tu código de verificación de Urbify` (revisa también el correo no deseado). La cuenta de ensayo se borra sola a las 24 horas.

Para apagar todo: `docker compose down` (los datos se conservan).

## 4. Ensayo (el día anterior)

Hacer **todo** esto con la persona que va a presentar, en el computador con el que se presentará:

- [ ] `scripts\presentacion.ps1 -ProbarCorreo <correo personal>` termina en "URBIFY LISTO" y el correo llega.
- [ ] En `http://localhost`: registrar un correo **real**, escribir el código y entrar.
- [ ] Iniciar sesión como **cliente**, buscar un servicio y crear una solicitud.
- [ ] En **Mi Perfil**, activar "Quiero ofrecer mis servicios" y cambiar entre **modo cliente** y **modo proveedor**.
- [ ] Iniciar sesión como **administrador** (se crea con `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin` dentro de `backend`, o desde Docker: ver `README.md`).
- [ ] Si se usará túnel: abrir la dirección `https://...` del túnel desde un **celular con datos móviles** y repetir el registro.
- [ ] Hacer una copia de seguridad de la base de datos (opcional): `docker exec urbify-db mysqldump -uroot -p<clave> urbify_db > copia.sql`.

## 5. Día de la presentación

1. Abrir Docker Desktop y esperar a que diga "Running".
2. `scripts\presentacion.ps1` (con `-Tunel` si otras personas van a entrar; ver la sección 6).
3. Abrir `http://localhost` y comprobar que carga.
4. Tener a mano las cuentas de prueba (cliente, proveedor, administrador) y un correo real para mostrar la verificación.
5. **Plan B** si falla el túnel o el internet: presentar desde `http://localhost` en el mismo computador. El correo del código sí necesita internet.

## 6. Túnel para que otras personas entren (no probado aquí)

1. Instalar `cloudflared` (por ejemplo `winget install Cloudflare.cloudflared`; **verificar el comando en la página de Cloudflare**).
2. `scripts\presentacion.ps1 -Tunel`. Al final aparece una línea con una dirección `https://....trycloudflare.com`: **esa se comparte**. Ctrl+C cierra el túnel.
3. La dirección cambia cada vez que se enciende el túnel. No hay que configurarla en ningún otro sitio porque la página y la API salen del mismo origen.

**Con varias personas a la vez.** Todos los visitantes llegan al servidor con **la misma dirección IP** (la del túnel), y los límites de peticiones de Urbify son por IP. Para una presentación con muchas personas, agregar al `.env` y volver a ejecutar el script:

```
RATE_LIMIT_GLOBAL=20000
RATE_LIMIT_PUBLIC_PER_MINUTE=5000
RATE_LIMIT_REGISTER_PER_HOUR=500
RATE_LIMIT_LOGIN_IP=2000
RATE_LIMIT_LOGIN_ACCOUNT_IP=50
RATE_LIMIT_VERIFY_IP_PER_HOUR=2000
RATE_LIMIT_SEND_CODE_IP_PER_HOUR=500
```

Es **solo para la demostración**: al terminar, borrar esas líneas. Los límites por cuenta y por correo (fuerza bruta, códigos) se mantienen.

## 7. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| "Docker no está encendido" | Abrir Docker Desktop y esperar a "Running". |
| "Falta el archivo .env" | Pedirlo a quien lo creó. No se sube a Git. |
| La API no responde | El script muestra las últimas líneas del servidor: dicen qué variable falta (en producción es estricto con `JWT_SECRET`, `DB_PASSWORD`...). |
| **"Cannot find module" o errores de certificado al construir** | Un antivirus intercepta la descarga. Ver la sección 8. |
| El código no llega por correo | `docker compose logs backend` y buscar "No se pudo enviar". Revisar spam. Si el error habla de certificado: sección 8. Si la clave de Gmail se cambió, actualizar `GMAIL_APP_PASSWORD`. |
| Error 429 al registrarse varias veces | Es el límite de seguridad por IP o por correo; esperar o subir los límites (sección 6). |

## 8. Antivirus que intercepta HTTPS (Norton)

**Norton Web/Mail Shield** (y algunos otros) intercepta las conexiones seguras con su propio certificado. Dentro de Docker eso rompe la instalación de paquetes (`npm`) y el envío del correo. En ese computador se soluciona **sin desactivar ninguna verificación**, dándole a Docker el certificado raíz del antivirus (es un certificado público, no un secreto).

En PowerShell, **una vez por computador**:

```powershell
$c = Get-ChildItem Cert:\CurrentUser\Root, Cert:\LocalMachine\Root | Where-Object { $_.Subject -like '*Norton Web/Mail Shield Root*' } | Select-Object -First 1
$der = [Convert]::ToBase64String($c.RawData, 'InsertLineBreaks')
$pem = "-----BEGIN CERTIFICATE-----`n$der`n-----END CERTIFICATE-----`n"
[Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pem))
```

Copiar el texto largo que imprime y agregarlo al `.env`:

```
EXTRA_CA_PEM_B64=<el texto largo>
```

Con eso, `docker compose` construye las imágenes confiando en ese certificado y el backend también lo usa para enviar el correo. Con otro antivirus, cambiar el texto `Norton Web/Mail Shield Root` por el nombre de su certificado raíz.

## 9. Seguridad durante la presentación

- La clave de Gmail y el `.env` **no se comparten por chats públicos ni se suben a Git**. Cada persona que presente necesita su copia, entregada en privado.
- La contraseña de aplicación se puede **revocar** en myaccount.google.com/apppasswords y crear otra en 2 minutos. Conviene hacerlo después de la presentación.
- El túnel hace pública la página: no dejarlo abierto cuando no se esté presentando, y no usar datos reales de personas.
