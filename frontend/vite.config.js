import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Ruta base de los assets. '/' sirve desde la raíz (Docker/Nginx y `npm run dev`).
  // Para GitHub Pages, `npm run deploy` compila con --base=/Urbify/ (ver package.json).
  // Antes estaba fijo en '/Urbify/', lo que dejaba la imagen Docker con los <script>
  // apuntando a /Urbify/assets/*, que Nginx no encontraba -> página en blanco.
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Separa las librerías grandes del código de la app: un único chunk de ~540 kB provocaba el aviso de
        // tamaño de Vite y obligaba a descargar todo ante cualquier cambio del código propio.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/leaflet/.test(id)) return 'vendor-mapa';
          if (/framer-motion|[\\/]motion[\\/]|motion-dom|motion-utils/.test(id)) return 'vendor-animacion';
          if (/react-router|@remix-run|react-dom|[\\/]react[\\/]|scheduler/.test(id)) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
});
