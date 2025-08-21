// src/components/SmoothDotsLoader.jsx

import { motion } from "framer-motion";

const dotTransition = {
  duration: 0.6,
  repeat: Infinity,
  ease: "easeInOut",
};

export default function SmoothDotsLoader() {
  return (
    <div className="flex space-x-2 items-center justify-center">
      {[0, 0.2, 0.4].map((delay, index) => (
        <motion.span
          key={index}
          className="h-3 w-3 bg-white rounded-full"
          animate={{
            scale: [.5, 1, .5],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ ...dotTransition, delay }}
        />
      ))}
    </div>
  );
}
