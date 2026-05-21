import { motion } from "motion/react";

export function Stars() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Estrellas estáticas */}
      {Array.from({ length: 100 }).map((_, i) => {
        const size = Math.random() * 2 + 1;
        const x = Math.random() * 100;
        const y = Math.random() * 100;

        return (
          <motion.div
            key={`star-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              width: size,
              height: size,
              left: `${x}%`,
              top: `${y}%`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
            animate={{
              opacity: [Math.random() * 0.5 + 0.2, Math.random() * 0.8 + 0.2, Math.random() * 0.5 + 0.2],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        );
      })}

      {/* Niebla espacial */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(0, 100, 200, 0.1) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}
