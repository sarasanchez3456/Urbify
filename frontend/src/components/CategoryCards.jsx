import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Wrench, Zap, Palette, Cpu } from "lucide-react";

const categories = [
  { name: "Plomería", icon: Wrench, color: "#00ffff" },
  { name: "Electricidad", icon: Zap, color: "#ffff00" },
  { name: "Diseño", icon: Palette, color: "#ff44ff" },
  { name: "Tecnología", icon: Cpu, color: "#00ff88" },
];

export function CategoryCards() {
  return (
    <motion.div
      className="hidden lg:flex absolute bottom-12 right-12 gap-4 z-10"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
    >
      {categories.map((category, i) => {
        const Icon = category.icon;

        return (
          <Link key={category.name} to={`/buscar?categoria=${category.name}`}>
            <motion.div
              className="relative group cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div
                className="w-32 h-40 p-4 rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-300"
                style={{
                  background: "rgba(2, 6, 23, 0.6)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(0, 255, 255, 0.15)",
                }}
              >
                <motion.div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: `rgba(0, 255, 255, 0.1)`,
                    border: `1px solid ${category.color}40`,
                  }}
                  whileHover={{
                    background: `${category.color}20`,
                    boxShadow: `0 0 20px ${category.color}60`,
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: category.color }} />
                </motion.div>

                <span
                  className="font-['Poppins'] text-sm text-white/80 group-hover:text-white transition-colors duration-300"
                >
                  {category.name}
                </span>
              </div>

              {/* Efecto de brillo en hover */}
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  border: "1px solid transparent",
                }}
                whileHover={{
                  border: "1px solid #00ffff",
                  boxShadow: "0 0 30px rgba(0, 255, 255, 0.4)",
                }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          </Link>
        );
      })}
    </motion.div>
  );
}
