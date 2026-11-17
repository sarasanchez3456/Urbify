<#
  Levanta Urbify completo (base de datos + backend + página) y comprueba que funcione. Pensado para el ensayo y para el
  día de la presentación. Se ejecuta desde la carpeta del proyecto:

    powershell -ExecutionPolicy Bypass -File scripts\presentacion.ps1
    powershell -ExecutionPolicy Bypass -File scripts\presentacion.ps1 -ProbarCorreo tucorreo@gmail.com
    powershell -ExecutionPolicy Bypass -File scripts\presentacion.ps1 -Tunel

  -ProbarCorreo  registra una cuenta de ensayo con ese correo para comprobar que el código de verificación LLEGA.
  -Tunel         abre un túnel de Cloudflare (si está instalado) para que otras personas entren por una dirección https.
  Guía completa: docs/PRESENTACION.md
#>
param(
  [string]$ProbarCorreo = '',
  [switch]$Tunel
)

# Los errores de los programas externos (docker) se revisan con $LASTEXITCODE, no con excepciones.
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)

function Paso($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Bien($texto) { Write-Host "    OK  $texto" -ForegroundColor Green }
function Falla($texto) { Write-Host "`nERROR: $texto" -ForegroundColor Red; exit 1 }

Paso 'Comprobando Docker y el archivo .env'
docker info *> $null
if ($LASTEXITCODE -ne 0) { Falla 'Docker no está encendido. Abre Docker Desktop, espera a que diga "Running" y vuelve a ejecutar.' }
Bien 'Docker está encendido'
if (-not (Test-Path '.env')) { Falla 'Falta el archivo .env en la carpeta del proyecto (pídeselo a quien lo creó; no está en Git).' }
$env_texto = Get-Content '.env' -Raw
foreach ($variable in 'DB_PASSWORD', 'JWT_SECRET') {
  if ($env_texto -notmatch "(?m)^$variable=\S+") { Falla "El archivo .env no tiene $variable." }
}
Bien '.env tiene las variables obligatorias'
if ($env_texto -notmatch '(?m)^GMAIL_USER=\S+' -or $env_texto -notmatch '(?m)^GMAIL_APP_PASSWORD=\S+') {
  Write-Host '    AVISO  .env no tiene GMAIL_USER / GMAIL_APP_PASSWORD: NO llegarán los códigos de verificación por correo.' -ForegroundColor Yellow
}

Paso 'Levantando Urbify (base de datos, backend y página). La primera vez tarda unos minutos...'
$salida = docker compose up -d --build 2>&1
if ($LASTEXITCODE -ne 0) {
  $salida | Select-Object -Last 25 | ForEach-Object { Write-Host "    $_" }
  Falla 'docker compose falló. Si el mensaje habla de certificados o "Cannot find module", un antivirus (Norton) está interceptando la descarga: mira la sección "Antivirus" de docs/PRESENTACION.md.'
}

Paso 'Esperando a que la API y la base de datos respondan (hasta 2 minutos)'
$listo = $false
for ($i = 0; $i -lt 40; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing 'http://localhost/api/health?deep=1' -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $listo = $true; break }
  } catch { }
  Start-Sleep -Seconds 3
}
if (-not $listo) {
  docker compose logs --tail 25 backend
  Falla 'La API no respondió. Arriba están las últimas líneas del backend: dicen qué variable o servicio falla.'
}
Bien 'API y base de datos funcionando'
try {
  $web = Invoke-WebRequest -UseBasicParsing 'http://localhost/' -TimeoutSec 5
  if ($web.StatusCode -eq 200) { Bien 'La página responde en http://localhost' }
} catch { Falla 'La página (nginx) no responde en http://localhost.' }

if ($ProbarCorreo) {
  Paso "Probando que el código de verificación llegue a $ProbarCorreo"
  $cuerpo = @{ nombre = 'Ensayo'; apellido = 'Presentacion'; correo = $ProbarCorreo; contrasena = 'Clave-ensayo-12345'; rol = 'cliente' } | ConvertTo-Json
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'http://localhost/api/auth/registro' -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($cuerpo))
    Bien "La API aceptó el registro de ensayo (HTTP $($resp.StatusCode))"
    Write-Host "    Ahora revisa la bandeja de $ProbarCorreo (y la carpeta de spam): debe llegar 'XXXXXX es tu código de verificación de Urbify'." -ForegroundColor Yellow
    Write-Host '    Si NO llega en 1 minuto, mira: docker compose logs backend   (busca "No se pudo enviar").' -ForegroundColor Yellow
    Write-Host '    La cuenta de ensayo queda sin verificar y se borra sola a las 24 horas.' -ForegroundColor DarkGray
  } catch {
    Write-Host "    El registro de ensayo falló: $($_.Exception.Message) (si el correo ya existe, es normal)." -ForegroundColor Yellow
  }
}

Write-Host "`n================  URBIFY LISTO  ================" -ForegroundColor Green
Write-Host '  Esta computadora:  http://localhost'
Write-Host '  Apagar todo:       docker compose down'
if ($Tunel) {
  Paso 'Abriendo el túnel de Cloudflare (déjalo abierto durante la presentación; Ctrl+C lo cierra)'
  if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Falla 'cloudflared no está instalado. Instálalo (por ejemplo: winget install Cloudflare.cloudflared) y vuelve a ejecutar con -Tunel.'
  }
  Write-Host '  Busca abajo la línea con una dirección https://....trycloudflare.com: esa es la que se comparte.' -ForegroundColor Yellow
  cloudflared tunnel --url http://localhost:80
}
