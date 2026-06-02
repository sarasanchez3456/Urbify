import { motion } from "motion/react";

export function Globe() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none">
      {/* Globo terráqueo central con gradiente esmeralda */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 30% 30%, rgba(169, 210, 182, 0.12), rgba(0, 23, 24, 0.9))",
          boxShadow: "0 0 80px rgba(169, 210, 182, 0.2), inset 0 0 60px rgba(169, 210, 182, 0.06)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        {/* Red de conexiones */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 600">
          {/* Líneas de latitud */}
          {[150, 225, 300, 375, 450].map((cy, i) => (
            <ellipse
              key={`lat-${i}`}
              cx="300"
              cy="300"
              rx={cy - 150}
              ry={(cy - 150) * 0.3}
              fill="none"
              stroke="rgba(169, 210, 182, 0.15)"
              strokeWidth="1"
            />
          ))}

          {/* Líneas de longitud */}
          {[0, 30, 60, 90, 120, 150].map((angle, i) => (
            <ellipse
              key={`lon-${i}`}
              cx="300"
              cy="300"
              rx="150"
              ry="150"
              fill="none"
              stroke="rgba(169, 210, 182, 0.15)"
              strokeWidth="1"
              transform={`rotate(${angle} 300 300)`}
            />
          ))}

          {/* Puntos luminosos - ciudades */}
          {Array.from({ length: 40 }).map((_, i) => {
            const angle = (i * 360) / 40;
            const radius = 80 + Math.random() * 120;
            const x = 300 + Math.cos((angle * Math.PI) / 180) * radius;
            const y = 300 + Math.sin((angle * Math.PI) / 180) * radius;
            const colors = ['#a9d2b6', '#9fd1c1', '#acd0c7', '#c3eccf'];
            const color = colors[i % colors.length];

            return (
              <motion.circle
                key={`city-${i}`}
                cx={x}
                cy={y}
                r="2"
                fill={color}
                initial={{ opacity: 0.2 }}
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
              />
            );
          })}

          {/* Conexiones entre ciudades cercanas */}
          {Array.from({ length: 15 }).map((_, i) => {
            const a1 = Math.random() * 360;
            const a2 = a1 + 20 + Math.random() * 40;
            const r1 = 100 + Math.random() * 80;
            const r2 = 100 + Math.random() * 80;
            const x1 = 300 + Math.cos((a1 * Math.PI) / 180) * r1;
            const y1 = 300 + Math.sin((a1 * Math.PI) / 180) * r1;
            const x2 = 300 + Math.cos((a2 * Math.PI) / 180) * r2;
            const y2 = 300 + Math.sin((a2 * Math.PI) / 180) * r2;
            return (
              <motion.line
                key={`conn-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(169, 210, 182, 0.12)"
                strokeWidth="0.8"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 4 }}
              />
            );
          })}
        </svg>
      </motion.div>

      {/* Anillo principal esmeralda */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[140px] rounded-full"
          style={{
            border: "2px solid rgba(169, 210, 182, 0.4)",
            boxShadow: "0 0 20px rgba(169, 210, 182, 0.5), inset 0 0 20px rgba(169, 210, 182, 0.2)",
          }}
        />
      </motion.div>

      {/* Anillo secundario jade */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[130px] rounded-full rotate-45"
          style={{
            border: "2px solid rgba(159, 209, 193, 0.35)",
            boxShadow: "0 0 15px rgba(159, 209, 193, 0.4), inset 0 0 15px rgba(159, 209, 193, 0.15)",
          }}
        />
      </motion.div>

      {/* Anillo terciario teal */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[100px] rounded-full -rotate-30"
          style={{
            border: "1.5px solid rgba(172, 208, 199, 0.25)",
            boxShadow: "0 0 12px rgba(172, 208, 199, 0.3), inset 0 0 12px rgba(172, 208, 199, 0.1)",
          }}
        />
      </motion.div>

      {/* Partículas flotantes coloridas */}
      {Array.from({ length: 30 }).map((_, i) => {
        const size = 2 + Math.random() * 4;
        const startX = Math.random() * 600 - 300;
        const startY = Math.random() * 600 - 300;
        const colors = ['#a9d2b6', '#9fd1c1', '#acd0c7', '#c3eccf', '#daf1de'];
        const color = colors[i % colors.length];

        return (
          <motion.div
            key={`particle-${i}`}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: color,
              boxShadow: `0 0 ${size * 3}px ${color}`,
              left: `calc(50% + ${startX}px)`,
              top: `calc(50% + ${startY}px)`,
            }}
            animate={{
              y: [0, -80 - Math.random() * 80, 0],
              x: [0, Math.random() * 50 - 25, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 6 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        );
      })}

      {/* Cubos tecnológicos orbitando */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 360) / 8;
        const distance = 280;
        const colors = ['#a9d2b6', '#9fd1c1', '#acd0c7', '#8eb69b', '#a9d2b6', '#9fd1c1', '#acd0c7', '#8eb69b'];

        return (
          <motion.div
            key={`cube-${i}`}
            className="absolute w-8 h-8"
            style={{
              left: "50%",
              top: "50%",
              transformOrigin: "0 0",
            }}
            animate={{ rotate: [0, 360] }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear",
              delay: (i * 30) / 8,
            }}
          >
            <motion.div
              className="w-8 h-8"
              style={{
                border: "2px solid " + colors[i],
                background: "rgba(169, 210, 182, 0.06)",
                boxShadow: `0 0 10px ${colors[i]}`,
                transform: `translate(${Math.cos((angle * Math.PI) / 180) * distance}px, ${Math.sin((angle * Math.PI) / 180) * distance}px)`,
              }}
              animate={{ rotateX: [0, 360], rotateY: [0, 360] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
