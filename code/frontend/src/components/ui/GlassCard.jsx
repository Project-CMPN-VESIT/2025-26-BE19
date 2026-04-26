import React from 'react';
import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', hover = true, ...props }) {
  return (
    <motion.div
      className={`glass-card ${className}`}
      whileHover={hover ? { y: -5, rotateX: 1.6, rotateY: -1.6 } : undefined}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
