#!/bin/sh
# Se ejecuta DENTRO de un contenedor de Node (lo lanza scripts/desplegar-vercel.ps1; no se usa a mano).
# Publica la API y/o la página de Urbify en Vercel y comprueba que respondan.
#   /src            el repositorio (solo lectura)
#   /root           volumen con la sesión de Vercel (se conserva entre ejecuciones)
# Variables: QUE=todo|api|web, MIGRAR=1 (crear/actualizar tablas en TiDB antes), EXTRA_CA_PEM_B64 (certificado de antivirus)
set -e
API_URL="${API_URL:-https://urbify-api.vercel.app}"
WEB_URL="${WEB_URL:-https://urbify-web-gamma.vercel.app}"

# Un antivirus que intercepta HTTPS (Norton) rompe npm y la herramienta de Vercel: se confía en su certificado RAÍZ
# (público), sin desactivar ninguna verificación.
if [ -n "$EXTRA_CA_PEM_B64" ]; then
  echo "$EXTRA_CA_PEM_B64" | base64 -d > /tmp/extra-ca.pem
  cat /etc/ssl/certs/ca-certificates.crt /tmp/extra-ca.pem > /tmp/ca-bundle.pem
  npm config set cafile /tmp/ca-bundle.pem
  export NODE_EXTRA_CA_CERTS=/tmp/extra-ca.pem
fi

echo "==> Instalando la herramienta de Vercel"
npm install -g vercel@latest >/dev/null 2>&1
vercel --version

echo "==> Comprobando la sesión de Vercel"
if ! vercel whoami >/tmp/quien.txt 2>/dev/null; then
  echo "SIN_SESION"
  exit 3
fi
echo "    sesión iniciada como: $(tail -1 /tmp/quien.txt)"

copiar() { # carpeta del repo -> /trabajo/<carpeta> (sin node_modules, pruebas ni restos de despliegues anteriores)
  rm -rf "/trabajo/$1" && mkdir -p "/trabajo/$1"
  (cd "/src/$1" && tar cf - --exclude=node_modules --exclude=.vercel --exclude=dist --exclude=test --exclude=.env.local .) | (cd "/trabajo/$1" && tar xf -)
}

if [ "$MIGRAR" = "1" ]; then
  echo "==> Actualizando las tablas en TiDB (npm run migrate; se puede repetir sin riesgo)"
  copiar backend
  (cd /trabajo/backend && npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1 && npm ls --omit=dev --depth=0 >/dev/null && node src/scripts/migrate.js)
fi

if [ "$QUE" = "todo" ] || [ "$QUE" = "api" ]; then
  echo "==> Publicando la API (urbify-api)"
  copiar backend
  cd /trabajo/backend
  vercel link --yes --project urbify-api >/dev/null
  vercel --prod --yes 2>&1 | grep -E "Production|Aliased|Error|Ready" || true
fi

if [ "$QUE" = "todo" ] || [ "$QUE" = "web" ]; then
  echo "==> Publicando la página (urbify-web)"
  copiar frontend
  cd /trabajo/frontend
  # frontend/vercel.json y frontend/.env.production del repositorio ya traen la dirección de la API.
  vercel link --yes --project urbify-web >/dev/null
  vercel --prod --yes 2>&1 | grep -E "Production|Aliased|Error|Ready" || true
fi

echo "==> Comprobando que todo responda"
cat > /tmp/comprobar.js <<'JS'
const API = process.env.API_URL, WEB = process.env.WEB_URL;
const que = process.env.QUE;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function pedir(url, intentos = 4) {
  for (let i = 0; i < intentos; i += 1) {
    try { return await fetch(url, { headers: { Origin: WEB } }); } catch { await esperar(3000); }
  }
  return null;
}
(async () => {
  let fallas = 0;
  const ver = (ok, texto) => { console.log(`    ${ok ? 'OK   ' : 'FALLA'} ${texto}`); if (!ok) fallas += 1; };
  if (que === 'todo' || que === 'api') {
    const r = await pedir(`${API}/api/health?deep=1`);
    const j = r ? await r.json().catch(() => ({})) : {};
    ver(r && r.status === 200 && j.db === 'ok', `API y base de datos: ${r ? r.status : 'sin respuesta'} (${j.db || '?'})`);
    const c = await pedir(`${API}/api/categorias`);
    ver(c && c.status === 200, `La API lee categorías de la base: ${c ? c.status : 'sin respuesta'}`);
    ver(r && r.headers.get('access-control-allow-origin') === WEB, 'CORS: la API acepta el origen de la página');
  }
  if (que === 'todo' || que === 'web') {
    const w = await pedir(`${WEB}/`);
    ver(w && w.status === 200, `La página responde: ${w ? w.status : 'sin respuesta'}`);
    ver(w && /content-security-policy/i.test([...w.headers.keys()].join(',')), 'La página trae sus cabeceras de seguridad');
  }
  console.log(fallas ? `\nRESULTADO: ${fallas} comprobación(es) con falla` : '\nRESULTADO: todo respondió bien');
  process.exit(fallas ? 1 : 0);
})();
JS
API_URL="$API_URL" WEB_URL="$WEB_URL" QUE="$QUE" node /tmp/comprobar.js
