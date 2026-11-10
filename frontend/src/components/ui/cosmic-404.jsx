import createGlobe from "cobe";
import { useEffect, useRef } from "react";
import { cn } from "./utils";

// Globo puntillado (cobe) con la paleta de Urbify: esfera azul cobalto con tierra clara, resplandor teal y marcadores brillantes en
// Colombia (Medellín, Bogotá, Cali, Barranquilla).
const GLOBE_CONFIG = {
  devicePixelRatio: 2,
  context: { preserveDrawingBuffer: true },
  phi: 4.2,
  theta: 0.28,
  dark: 0,
  diffuse: 1,
  mapSamples: 22000,
  mapBrightness: 9,
  baseColor: [0.1, 0.3, 0.78],
  markerColor: [0.55, 0.95, 1],
  glowColor: [0.3, 0.75, 0.9],
  markers: [
    { location: [6.2518, -75.5636], size: 0.11 },
    { location: [4.711, -74.0721], size: 0.08 },
    { location: [3.4516, -76.532], size: 0.06 },
    { location: [10.9685, -74.7813], size: 0.06 },
  ],
};

export function Globe({ className, config = GLOBE_CONFIG }) {
  const contenedorRef = useRef(null);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return undefined;

    let phi = config.phi ?? 0;
    let globe = null;
    let anfitrion = null;

    // cobe envuelve el canvas en su propio <div> y, al destruirse, deja ese <div> y pierde el contexto WebGL (un canvas
    // con el contexto perdido ya no dibuja). Por eso cada dibujo (al montar, al cambiar el tamaño y en el doble montaje
    // de React en desarrollo) usa un contenedor nuevo, que se retira entero al limpiar.
    const limpiar = () => {
      globe?.destroy();
      globe = null;
      anfitrion?.remove();
      anfitrion = null;
    };

    const dibujar = () => {
      limpiar();
      anfitrion = document.createElement("div");
      anfitrion.style.cssText = "position:absolute;inset:0";
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.cssText = "display:block;width:100%;height:100%";
      anfitrion.appendChild(canvas);
      contenedor.appendChild(anfitrion);
      const ancho = Math.max(contenedor.offsetWidth, 1) * 2;
      globe = createGlobe(canvas, {
        ...config,
        width: ancho,
        height: ancho,
        onRender: (state) => {
          phi += 0.004;
          state.phi = phi;
        },
      });
    };

    dibujar();
    window.addEventListener("resize", dibujar);
    return () => {
      window.removeEventListener("resize", dibujar);
      limpiar();
    };
  }, [config]);
  // El tamaño lo manda quien lo usa (el contenedor se estira a su padre); el canvas lo llena.
  return <div ref={contenedorRef} className={cn(className)} style={{ position: "relative", width: "100%", height: "100%" }} />;
}
