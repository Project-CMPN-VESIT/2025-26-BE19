import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlowButton from '../ui/GlowButton';

export default function MarketingNav() {
  const { account, login } = useAuth();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-slate-950/65 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2 font-heading text-xl font-bold text-white">
          <span className="rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet p-2">
            <Shield className="h-4 w-4" />
          </span>
          Debug
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <a href="#how-it-works" className="transition hover:text-white">
            How It Works
          </a>
          <a href="#ai-triage" className="transition hover:text-white">
            AI Triage
          </a>
          <a href="#escrow" className="transition hover:text-white">
            Escrow
          </a>
          <Link to="/bounties" className="transition hover:text-white">
            Explore
          </Link>
        </nav>
        {account ? (
          <Link
            to="/bounties"
            className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200"
          >
            Enter Platform
          </Link>
        ) : (
          <GlowButton onClick={login} className="text-xs uppercase tracking-[0.18em]">
            Connect Wallet
          </GlowButton>
        )}
      </div>
    </motion.header>
  );
}
