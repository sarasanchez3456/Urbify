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
