import { motion } from "motion/react";

export function Globe() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none">
      {/* Globo terráqueo central */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 30% 30%, rgba(0, 255, 255, 0.1), rgba(2, 6, 23, 0.8))",
          boxShadow: "0 0 80px rgba(0, 255, 255, 0.3), inset 0 0 60px rgba(0, 255, 255, 0.1)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        {/* Red de conexiones - continentes */}
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
              stroke="rgba(0, 255, 255, 0.2)"
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
              stroke="rgba(0, 255, 255, 0.2)"
              strokeWidth="1"
              transform={`rotate(${angle} 300 300)`}
            />
          ))}

          {/* Puntos luminosos simulando ciudades */}
          {Array.from({ length: 30 }).map((_, i) => {
            const angle = (i * 360) / 30;
            const radius = 100 + Math.random() * 100;
            const x = 300 + Math.cos((angle * Math.PI) / 180) * radius;
            const y = 300 + Math.sin((angle * Math.PI) / 180) * radius;

            return (
              <motion.circle
                key={`city-${i}`}
                cx={x}
                cy={y}
                r="2"
                fill="#00ffff"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
              />
            );
          })}
        </svg>
      </motion.div>

      {/* Anillo principal de energía (cián) */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[140px] rounded-full"
          style={{
            border: "2px solid rgba(0, 255, 255, 0.6)",
            boxShadow: "0 0 20px rgba(0, 255, 255, 0.8), inset 0 0 20px rgba(0, 255, 255, 0.4)",
          }}
        />
      </motion.div>

      {/* Anillo secundario de energía (magenta) */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[130px] rounded-full rotate-45"
          style={{
            border: "2px solid rgba(255, 68, 255, 0.5)",
            boxShadow: "0 0 15px rgba(255, 68, 255, 0.7), inset 0 0 15px rgba(255, 68, 255, 0.3)",
          }}
        />
      </motion.div>

      {/* Partículas flotantes */}
      {Array.from({ length: 20 }).map((_, i) => {
        const size = 3 + Math.random() * 3;
        const startX = Math.random() * 600 - 300;
        const startY = Math.random() * 600 - 300;

        return (
          <motion.div
            key={`particle-${i}`}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: i % 2 === 0 ? "#00ffff" : "#ff44ff",
              boxShadow: `0 0 ${size * 2}px ${i % 2 === 0 ? "#00ffff" : "#ff44ff"}`,
              left: `calc(50% + ${startX}px)`,
              top: `calc(50% + ${startY}px)`,
            }}
            animate={{
              y: [0, -100 - Math.random() * 100, 0],
              x: [0, Math.random() * 60 - 30, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
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

        return (
          <motion.div
            key={`cube-${i}`}
            className="absolute w-8 h-8"
            style={{
              left: "50%",
              top: "50%",
              transformOrigin: "0 0",
            }}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear",
              delay: (i * 30) / 8,
            }}
          >
            <motion.div
              className="w-8 h-8 border-2 border-cyan-400"
              style={{
                background: "rgba(0, 255, 255, 0.1)",
                boxShadow: "0 0 10px rgba(0, 255, 255, 0.5)",
                transform: `translate(${Math.cos((angle * Math.PI) / 180) * distance}px, ${Math.sin((angle * Math.PI) / 180) * distance}px)`,
              }}
              animate={{
                rotateX: [0, 360],
                rotateY: [0, 360],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
