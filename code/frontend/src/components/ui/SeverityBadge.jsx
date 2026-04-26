import React from 'react';

const toneBySeverity = {
  Critical: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
  High: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
  Medium: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  Low: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
};

export default function SeverityBadge({ severity = 'Medium', className = '' }) {
  const tone = toneBySeverity[severity] || toneBySeverity.Medium;
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone} ${className}`}>
      {severity}
    </span>
  );
}
