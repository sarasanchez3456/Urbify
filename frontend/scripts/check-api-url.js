// Protege `npm run deploy` (GitHub Pages): falla si la URL de la API sigue siendo el marcador de posición de
// .env.production (https://TU-BACKEND-URL/api) o no es una URL https. VITE_API_URL del entorno tiene prioridad.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const archivo = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.production');
let url = process.env.VITE_API_URL;
if (!url) {
  const m = /^VITE_API_URL\s*=\s*(.+)$/m.exec(readFileSync(archivo, 'utf8'));
  url = m ? m[1].trim() : '';
}

const marcador = /TU-BACKEND-URL/i.test(url);
if (!url || marcador || !/^https:\/\/[^/\s]+(\/.*)?$/.test(url)) {
  console.error(`Despliegue cancelado: VITE_API_URL no es válida ("${url || 'vacía'}").`);
  console.error('Define la URL https real de la API en frontend/.env.production o con la variable de entorno VITE_API_URL.');
  process.exit(1);
}
console.log(`VITE_API_URL = ${url}`);
