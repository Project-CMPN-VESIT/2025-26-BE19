import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

export default function StatCard({ label, value, hint, icon: Icon, tone = 'blue', loading = false }) {
  const tones = {
    blue: 'from-blue-400/30 to-cyan-300/5 text-blue-200',
    violet: 'from-violet-400/30 to-violet-200/5 text-violet-200',
    cyan: 'from-cyan-300/30 to-sky-300/5 text-cyan-200',
  };

  return (
    <GlassCard className="p-5" hover>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</span>
        {Icon ? (
          <div className={`rounded-lg border border-white/10 bg-gradient-to-br p-2 ${tones[tone]}`}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      {loading ? (
        <div className="h-9 w-1/2 animate-pulse rounded bg-white/10" />
      ) : (
        <motion.div
          key={value}
          initial={{ opacity: 0.4, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
          className="font-heading text-3xl font-bold text-white"
        >
          {value}
        </motion.div>
      )}
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
    </GlassCard>
  );
}
