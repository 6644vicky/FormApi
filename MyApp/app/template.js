"use client";

import { motion } from "framer-motion";

export default function Template({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </motion.div>
  );
}
