import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  primary:
    'bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-violet text-white shadow-glow hover:shadow-[0_0_44px_rgba(59,130,246,0.45)]',
  secondary:
    'bg-white/[0.04] text-slate-100 border border-white/15 hover:border-cyan-300/55 hover:bg-white/[0.08]',
  danger:
    'bg-rose-500/20 text-rose-200 border border-rose-400/35 hover:bg-rose-500/30',
};

export default function GlowButton({
  children,
  className = '',
  variant = 'primary',
  as: Comp = 'button',
  whileHover,
  whileTap,
  ...props
}) {
  return (
    <motion.div whileHover={whileHover || { scale: 1.02, y: -1 }} whileTap={whileTap || { scale: 0.98 }}>
      <Comp
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </Comp>
    </motion.div>
  );
}
