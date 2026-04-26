import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Compass, FolderKanban, LayoutDashboard, PlusCircle, Shield, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = (role) => [
  { to: '/bounties', label: 'Control Center', icon: LayoutDashboard },
  { to: '/bounties', label: 'Bounty Explorer', icon: Compass },
  { to: '/profile', label: 'Profile', icon: UserRound },
  ...(role === 'organization' ? [{ to: '/create-bounty', label: 'Launch Program', icon: PlusCircle }] : []),
];

export default function Sidebar() {
  const location = useLocation();
  const { userProfile } = useAuth();
  const role = userProfile?.role || 'researcher';

  return (
    <aside className="hidden w-[260px] flex-col p-5 xl:flex">
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="glass-card h-[calc(100vh-2.5rem)] p-4">
        <Link to="/" className="mb-6 flex items-center gap-2 border-b border-white/10 px-2 pb-5">
          <span className="rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet p-2 text-white">
            <Shield className="h-4 w-4" />
          </span>
          <span className="font-heading text-lg font-semibold text-white">Debug</span>
        </Link>

        <p className="kicker px-2">Navigation</p>
        <div className="mt-3 space-y-1.5">
          {navItems(role).map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to === '/bounties' && location.pathname.startsWith('/bounty/'));
            return (
              <Link
                key={`${to}-${label}`}
                to={to}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                  active ? 'bg-cyan-400/15 text-cyan-200 shadow-glow' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
            <FolderKanban className="h-3.5 w-3.5" />
            Role Context
          </div>
          <p className="text-sm text-white">{role === 'organization' ? 'Organization Host' : 'Researcher Mode'}</p>
          <p className="mt-2 text-xs text-slate-400">
            {role === 'organization' ? 'Deploy and triage bounty programs with escrow controls.' : 'Hunt, submit, and monitor verified reports.'}
          </p>
        </div>

        <div className="mt-auto rounded-xl border border-violet-300/30 bg-violet-500/10 p-3">
          <div className="flex items-center gap-2 text-sm text-violet-100">
            <AlertTriangle className="h-4 w-4" />
            Smart Escrow Active
          </div>
          <p className="mt-1 text-xs text-violet-200/80">Funds remain locked until explicit acceptance workflow runs on-chain.</p>
        </div>
      </motion.div>
    </aside>
  );
}
