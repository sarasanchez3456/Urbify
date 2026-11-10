import { useEffect, useRef } from "react";
import { cn } from "./utils";

// Globo puntillado dibujado en un canvas 2D (sin WebGL, así se ve igual en cualquier navegador y equipo).
// Los puntos de tierra salen de una máscara del mapamundo (public/images/mapa-mundo.png, tomada de la librería cobe,
// licencia MIT): se reparten puntos uniformes sobre la esfera (espiral de Fibonacci), se conservan los que caen en
// tierra y se rotan en cada cuadro. Paleta de Urbify: esfera blanco azulado, puntos azul noche, resplandor teal y
// marcadores cobalto en Colombia.
const PUNTOS = 9000;
const VELOCIDAD = 0.004; // radianes por cuadro
const INCLINACION = 0.3;
const MARCADORES = [
  { lat: 6.2518, lng: -75.5636, r: 0.055 }, // Medellín
  { lat: 4.711, lng: -74.0721, r: 0.042 }, // Bogotá
  { lat: 3.4516, lng: -76.532, r: 0.035 }, // Cali
  { lat: 10.9685, lng: -74.7813, r: 0.035 }, // Barranquilla
];

const aRad = (g) => (g * Math.PI) / 180;

// Posición en la esfera (x derecha, y arriba, z hacia quien mira) para una latitud y longitud, ya girada.
function proyectar(lat, lng, giro, inclinacion) {
  const la = aRad(lat);
  const lo = aRad(lng) + giro;
  const x = Math.cos(la) * Math.sin(lo);
  const y = Math.sin(la);
  const z = Math.cos(la) * Math.cos(lo);
  const ci = Math.cos(inclinacion);
  const si = Math.sin(inclinacion);
  return { x, y: y * ci - z * si, z: y * si + z * ci };
}

export function Globe({ className }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    let cancelado = false;
    let cuadro = 0;
    let giro = 4.2;
    let tierra = []; // [{ lat, lng }]
    const sinMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const dibujar = () => {
      const w = canvas.width;
      const c = w / 2;
      const R = w * 0.38; // deja sitio al resplandor dentro del canvas
      ctx.clearRect(0, 0, w, w);

      // Resplandor teal alrededor de la esfera
      const resplandor = ctx.createRadialGradient(c, c, R * 0.92, c, c, R * 1.22);
      resplandor.addColorStop(0, "rgba(120, 220, 245, 0.55)");
      resplandor.addColorStop(1, "rgba(120, 220, 245, 0)");
      ctx.fillStyle = resplandor;
      ctx.beginPath();
      ctx.arc(c, c, R * 1.22, 0, Math.PI * 2);
      ctx.fill();

      // Esfera: blanco azulado con luz desde arriba a la izquierda
      const esfera = ctx.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R);
      esfera.addColorStop(0, "#ffffff");
      esfera.addColorStop(0.65, "#e8f3fc");
      esfera.addColorStop(1, "#b9d6ef");
      ctx.fillStyle = esfera;
      ctx.beginPath();
      ctx.arc(c, c, R, 0, Math.PI * 2);
      ctx.fill();

      // Puntos de tierra (solo la mitad visible; más pequeños y claros hacia el borde)
      for (const p of tierra) {
        const { x, y, z } = proyectar(p.lat, p.lng, giro, INCLINACION);
        if (z <= 0.02) continue;
        const radio = Math.max(w * 0.0042 * (0.45 + z * 0.75), 0.6);
        ctx.fillStyle = `rgba(14, 38, 92, ${(0.3 + 0.62 * z).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(c + x * R, c - y * R, radio, 0, Math.PI * 2);
        ctx.fill();
      }

      // Marcadores de Colombia
      for (const m of MARCADORES) {
        const { x, y, z } = proyectar(m.lat, m.lng, giro, INCLINACION);
        if (z <= 0.05) continue;
        const px = c + x * R;
        const py = c - y * R;
        const halo = ctx.createRadialGradient(px, py, 0, px, py, R * m.r * 2.4);
        halo.addColorStop(0, "rgba(40, 110, 230, 0.45)");
        halo.addColorStop(1, "rgba(40, 110, 230, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(px, py, R * m.r * 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1d5fd8";
        ctx.beginPath();
        ctx.arc(px, py, Math.max(R * m.r * 0.5 * (0.6 + z * 0.6), 1.5), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const lado = Math.max(canvas.clientWidth, 1);
      canvas.width = Math.round(lado * dpr);
      canvas.height = Math.round(lado * dpr);
      dibujar();
    };

    const animar = () => {
      if (cancelado) return;
      giro += VELOCIDAD;
      dibujar();
      cuadro = requestAnimationFrame(animar);
    };

    // Máscara de tierra: se lee el mapa y se guardan las coordenadas de los puntos que caen en tierra.
    const mapa = new Image();
    mapa.onload = () => {
      if (cancelado) return;
      const m = document.createElement("canvas");
      m.width = mapa.naturalWidth;
      m.height = mapa.naturalHeight;
      const mc = m.getContext("2d", { willReadFrequently: true });
      mc.drawImage(mapa, 0, 0);
      const datos = mc.getImageData(0, 0, m.width, m.height).data;
      const dorado = Math.PI * (3 - Math.sqrt(5));
      const lista = [];
      for (let i = 0; i < PUNTOS; i += 1) {
        const y = 1 - (i / (PUNTOS - 1)) * 2; // -1..1
        const lat = (Math.asin(y) * 180) / Math.PI;
        const lng = (((i * dorado) % (Math.PI * 2)) * 180) / Math.PI - 180;
        const u = Math.min(m.width - 1, Math.max(0, Math.floor(((lng + 180) / 360) * m.width)));
        const v = Math.min(m.height - 1, Math.max(0, Math.floor(((90 - lat) / 180) * m.height)));
        if (datos[(v * m.width + u) * 4] > 128) lista.push({ lat, lng });
      }
      tierra = lista;
      if (sinMovimiento) dibujar();
    };
    mapa.src = `${import.meta.env.BASE_URL || "/"}images/mapa-mundo.png`;

    ajustar();
    if (!sinMovimiento) cuadro = requestAnimationFrame(animar);
    window.addEventListener("resize", ajustar);
    return () => {
      cancelado = true;
      cancelAnimationFrame(cuadro);
      window.removeEventListener("resize", ajustar);
    };
  }, []);

  return (
    <div className={cn(className)} style={{ width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
