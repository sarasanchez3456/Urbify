<#
  Actualiza Urbify en Vercel (API y/o página) con el código que tengas en esta carpeta, y comprueba que responda.
  Usa Docker (no hace falta instalar Node). Desde la carpeta del proyecto:

    powershell -ExecutionPolicy Bypass -File scripts\desplegar-vercel.ps1                # publica API y página
    powershell -ExecutionPolicy Bypass -File scripts\desplegar-vercel.ps1 -Que api       # solo la API
    powershell -ExecutionPolicy Bypass -File scripts\desplegar-vercel.ps1 -Que web       # solo la página
    powershell -ExecutionPolicy Bypass -File scripts\desplegar-vercel.ps1 -Migrar        # antes, actualiza las tablas de TiDB

  ANTES de publicar:  git checkout main; git pull   (publica lo que esté fusionado y probado por el CI).
  Si cambió la estructura de la base de datos usa -Migrar (necesita el archivo con los datos de TiDB, fuera del repositorio).
  Primera vez en un computador: pide iniciar sesión en Vercel (se abre un enlace con un código que autorizas en el navegador).
  Guía: docs/DESPLIEGUE_VERCEL.md
#>
param(
  [ValidateSet('todo', 'api', 'web')][string]$Que = 'todo',
  [switch]$Migrar,
  # Archivo con DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_SSL=true de TiDB. Por defecto, tidb.env junto a la carpeta del proyecto.
  [string]$ArchivoTidb = ''
)

$ErrorActionPreference = 'Continue'
$raiz = Split-Path $PSScriptRoot -Parent
Set-Location $raiz

function Paso($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Falla($texto) { Write-Host "`nERROR: $texto" -ForegroundColor Red; exit 1 }

Paso 'Comprobando Docker y el código'
docker info *> $null
if ($LASTEXITCODE -ne 0) { Falla 'Docker no está encendido. Abre Docker Desktop, espera a que diga "Running" y vuelve a ejecutar.' }
$rama = (git rev-parse --abbrev-ref HEAD).Trim()
$sucio = (git status --porcelain)
Write-Host "    Rama: $rama"
if ($rama -ne 'main') { Write-Host "    AVISO  No estás en 'main': se publicará el código de la rama '$rama'." -ForegroundColor Yellow }
if ($sucio) { Write-Host '    AVISO  Hay cambios sin guardar en Git: se publicarán tal como están.' -ForegroundColor Yellow }

# Certificado de antivirus (Norton) opcional: variable de entorno o línea EXTRA_CA_PEM_B64 del .env
$certificado = $env:EXTRA_CA_PEM_B64
if (-not $certificado -and (Test-Path '.env')) {
  $linea = Get-Content '.env' | Where-Object { $_ -match '^EXTRA_CA_PEM_B64=\S+' } | Select-Object -First 1
  if ($linea) { $certificado = ($linea -replace '^EXTRA_CA_PEM_B64=', '').Trim() }
}

$argumentos = @('run', '--rm', '-v', 'vercel_home:/root', '-v', "${raiz}:/src:ro", '-e', "QUE=$Que", '-e', 'CI=1')
if ($certificado) { $argumentos += @('-e', "EXTRA_CA_PEM_B64=$certificado") }
if ($Migrar) {
  if (-not $ArchivoTidb) { $ArchivoTidb = Join-Path (Split-Path $raiz -Parent) 'tidb.env' }
  if (-not (Test-Path $ArchivoTidb)) { Falla "Para -Migrar hace falta el archivo con los datos de TiDB: $ArchivoTidb (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_SSL=true)." }
  $argumentos += @('--env-file', $ArchivoTidb, '-e', 'DB_NAME=urbify_db', '-e', 'MIGRAR=1')
}
$argumentos += @('-v', "${PSScriptRoot}\desplegar-vercel.sh:/run.sh:ro", 'node:20-alpine', 'sh', '/run.sh')

Paso "Publicando en Vercel (Que = $Que$(if ($Migrar) { ', con migración' }))"
& docker @argumentos
$codigo = $LASTEXITCODE

if ($codigo -eq 3) {
  Paso 'Falta iniciar sesión en Vercel (solo la primera vez en este computador)'
  Write-Host '    Se mostrará un enlace con un código: ábrelo en el navegador donde tienes la cuenta de Vercel y autoriza.' -ForegroundColor Yellow
  $login = @('run', '--rm', '-it', '-v', 'vercel_home:/root', '-e', 'CI=')
  if ($certificado) { $login += @('-e', "EXTRA_CA_PEM_B64=$certificado") }
  $login += @('node:20-alpine', 'sh', '-c', 'if [ -n "$EXTRA_CA_PEM_B64" ]; then echo "$EXTRA_CA_PEM_B64" | base64 -d > /tmp/e.pem; cat /etc/ssl/certs/ca-certificates.crt /tmp/e.pem > /tmp/b.pem; npm config set cafile /tmp/b.pem; export NODE_EXTRA_CA_CERTS=/tmp/e.pem; fi; npm install -g vercel@latest >/dev/null 2>&1 && vercel login')
  & docker @login
  Write-Host '    Sesión guardada. Volviendo a publicar...' -ForegroundColor Green
  & docker @argumentos
  $codigo = $LASTEXITCODE
}

if ($codigo -ne 0) { Falla 'La publicación o las comprobaciones fallaron: revisa los mensajes de arriba.' }
Write-Host "`n================  PUBLICADO  ================" -ForegroundColor Green
Write-Host '  Página: https://urbify-web-gamma.vercel.app'
Write-Host '  API:    https://urbify-api.vercel.app'
