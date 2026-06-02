import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

const tooltipMessages = [
  "Explora el futuro digital",
  "Conectando talentos globales",
  "Innovación sin límites",
  "Tu próxima oportunidad está aquí",
];

export function Tooltip() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    let lastTarget = null;

    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });

      const target = e.target;
      if (target === lastTarget) return;
      lastTarget = target;

      const isInteractive =
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.closest("button") ||
        target.closest("a");

      if (isInteractive) {
        setMessage(tooltipMessages[Math.floor(Math.random() * tooltipMessages.length)]);
        setShowTooltip(true);
      } else {
        setShowTooltip(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <AnimatePresence>
      {showTooltip && message && (
        <motion.div
          className="fixed pointer-events-none z-[9998] px-3 py-1.5 rounded-md font-['Orbitron']"
          style={{
            background: "rgba(0, 0, 0, 0.8)",
            border: "1px solid #00ffff",
            boxShadow: "0 0 15px rgba(0, 255, 255, 0.4)",
            fontSize: "0.75rem",
            color: "#00ffff",
            whiteSpace: "nowrap",
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: mousePosition.x + 15,
            y: mousePosition.y + 15,
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
