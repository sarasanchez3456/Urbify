import { motion } from "motion/react";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <motion.div
      className="absolute bottom-32 left-12 max-w-xl z-10"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <div
        className="p-8 rounded-2xl"
        style={{
          background: "rgba(2, 6, 23, 0.5)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(0, 255, 255, 0.15)",
        }}
      >
        <motion.h2
          className="font-['Orbitron'] mb-4 text-white"
          style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            background: "linear-gradient(90deg, #ffffff, #00ffff, #ff44ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1.2,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Conecta con el Futuro
        </motion.h2>

        <motion.p
          className="font-['Poppins'] text-gray-300 mb-6"
          style={{
            fontSize: "clamp(1rem, 2vw, 1.125rem)",
            lineHeight: 1.6,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          La plataforma que une a trabajadores independientes y clientes en todo el mundo.
          Innovación, confianza y velocidad en cada conexión.
        </motion.p>

        <Link to="/buscar">
          <motion.button
            className="px-8 py-3 rounded-lg font-['Poppins'] transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #00ffff, #ff44ff)",
              border: "1px solid #00ffff",
              color: "#000000",
              boxShadow: "0 4px 20px rgba(0, 255, 255, 0.3)",
            }}
            whileHover={{
              boxShadow: "0 6px 30px rgba(0, 255, 255, 0.5), 0 0 40px rgba(255, 68, 255, 0.3)",
              scale: 1.05,
            }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            Comenzar Ahora
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}
