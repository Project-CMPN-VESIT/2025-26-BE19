import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, BrainCircuit, ChevronRight, LockKeyhole, Orbit, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import MarketingNav from '../components/layout/MarketingNav';
import GlassCard from '../components/ui/GlassCard';
import GlowButton from '../components/ui/GlowButton';
import AnimatedContainer from '../components/ui/AnimatedContainer';

const stats = [
  { label: 'Total Paid Out', value: '$4.2M+' },
  { label: 'Active Bounties', value: '186' },
  { label: 'Reports Resolved', value: '3,940' },
];

const howItWorks = [
  {
    title: 'Launch and lock escrow',
    description: 'Organizations create programs and lock rewards on-chain so payment availability is guaranteed.',
    icon: LockKeyhole,
  },
  {
    title: 'Researchers submit findings',
    description: 'Hunters submit reproducible reports with markdown evidence, payloads, and impact narratives.',
    icon: ShieldCheck,
  },
  {
    title: 'AI-assisted triage + instant release',
    description: 'Gemini analyzes quality and duplication while contracts execute payouts when accepted.',
    icon: BrainCircuit,
  },
];

const testimonials = [
  {
    quote:
      'Debug turned our security process from fragmented to deterministic. Escrow-based payouts removed negotiation friction overnight.',
    name: 'Katherine N.',
    role: 'Head of Security, ArcBridge',
  },
  {
    quote:
      'The AI triage layer catches weak submissions immediately and accelerates the high signal reports we care about.',
    name: 'Dmitri L.',
    role: 'Security Lead, Volt Protocol',
  },
  {
    quote:
      'As a researcher, transparent reward logic and fast response flow changed where I prioritize my time.',
    name: 'Isha R.',
    role: 'Independent Researcher',
  },
];

function Counter({ value, label, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
      className="glass-card p-5"
    >
      <div className="font-heading text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative z-10">
      <MarketingNav />

      <section className="mx-auto flex min-h-[92vh] w-full max-w-7xl items-center px-4 pb-16 pt-28 md:px-8">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <AnimatedContainer className="space-y-7">
            <p className="kicker">Security + Finance Layer</p>
            <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
              Decentralized Bug Bounties.
              <br />
              <span className="bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-violet bg-clip-text text-transparent">
                Instant. Trustless.
              </span>
            </h1>
            <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
              Debug combines smart contract escrow with Gemini-powered triage, giving organizations deterministic payouts and giving
              researchers fast, transparent verdicts.
            </p>
            <div className="flex flex-wrap gap-3">
              <GlowButton as={Link} to="/create-bounty" className="px-6 py-3 text-xs uppercase tracking-[0.2em]">
                Launch Program
                <Rocket className="h-4 w-4" />
              </GlowButton>
              <GlowButton as={Link} to="/bounties" variant="secondary" className="px-6 py-3 text-xs uppercase tracking-[0.2em]">
                Explore Bounties
                <ChevronRight className="h-4 w-4" />
              </GlowButton>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {stats.map((stat, idx) => (
                <Counter key={stat.label} value={stat.value} label={stat.label} delay={idx * 0.1} />
              ))}
            </div>
          </AnimatedContainer>

          <AnimatedContainer delay={0.15}>
            <GlassCard className="relative overflow-hidden p-6" hover={false}>
              <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-violet-400/20 blur-3xl" />
              <div className="relative space-y-5">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="kicker">Live Triage Pulse</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Gemini Queue</span>
                    <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-xs text-emerald-300">Optimal</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                      initial={{ width: '20%' }}
                      animate={{ width: ['20%', '78%', '55%', '88%'] }}
                      transition={{ duration: 9, repeat: Infinity, repeatType: 'reverse' }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <Orbit className="mb-2 h-5 w-5 text-cyan-300" />
                    <p className="text-sm text-white">On-chain settlement</p>
                    <p className="mt-1 text-xs text-slate-400">Funds move only through escrow actions.</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <Bot className="mb-2 h-5 w-5 text-violet-300" />
                    <p className="text-sm text-white">AI duplicate checks</p>
                    <p className="mt-1 text-xs text-slate-400">Low-noise review for faster final decisions.</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </AnimatedContainer>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
        <AnimatedContainer>
          <p className="kicker text-center">How It Works</p>
          <h2 className="mt-2 text-center text-3xl sm:text-4xl">Trustless security workflow in 3 steps</h2>
        </AnimatedContainer>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {howItWorks.map((step, idx) => (
            <AnimatedContainer key={step.title} delay={idx * 0.08}>
              <GlassCard className="h-full p-5">
                <div className="mb-4 flex items-center justify-between">
                  <step.icon className="h-5 w-5 text-cyan-300" />
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400">0{idx + 1}</span>
                </div>
                <h3 className="text-lg">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{step.description}</p>
              </GlassCard>
            </AnimatedContainer>
          ))}
        </div>
      </section>

      <section id="ai-triage" className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
        <GlassCard className="overflow-hidden p-6 md:p-10" hover={false}>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="kicker">AI Triage Engine</p>
              <h2 className="mt-2 text-3xl sm:text-4xl">Gemini-powered vulnerability intelligence</h2>
              <p className="mt-3 max-w-xl text-slate-300">
                Every report goes through contextual severity analysis, duplicate probability scoring, and remediation suggestions before
                your team reviews the final payload.
              </p>
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  Severity confidence insights
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  Duplicate risk clustering
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  Instant reviewer briefing cards
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-300">Realtime Signal</p>
                Severity: <strong>High</strong> | Confidence: <strong>91%</strong>
              </div>
              <div className="rounded-xl border border-violet-300/25 bg-violet-400/10 p-4 text-sm text-violet-100">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-violet-300">Duplicate Scan</p>
                Similarity flagged against two historical submissions.
              </div>
              <div className="rounded-xl border border-white/15 bg-black/35 p-4 text-sm text-slate-200">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Recommended Action</p>
                Validate payload with staging auth context and check nonce replay controls.
              </div>
            </div>
          </div>
        </GlassCard>
      </section>

      <section id="escrow" className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <GlassCard className="p-6" hover={false}>
            <p className="kicker">Smart Escrow</p>
            <h2 className="mt-2 text-3xl">On-chain payout guarantees</h2>
            <p className="mt-3 text-slate-300">
              Rewards are deposited to escrow at launch and released only after report acceptance. No manual transfer dependency.
            </p>
          </GlassCard>
          <GlassCard className="p-6" hover={false}>
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Escrow Lifecycle</div>
              {['Deposit locked', 'Report validated', 'Payout executed'].map((stage, index) => (
                <div key={stage} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/10 text-xs text-cyan-100">
                    {index + 1}
                  </div>
                  <span>{stage}</span>
                  <div className="ml-auto h-2 w-32 overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                      initial={{ width: '0%' }}
                      whileInView={{ width: `${(index + 1) * 33}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: index * 0.2 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
        <p className="kicker text-center">Testimonials</p>
        <h2 className="mt-2 text-center text-3xl sm:text-4xl">Trusted by web3 security teams</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {testimonials.map((item, idx) => (
            <AnimatedContainer key={item.name} delay={idx * 0.08}>
              <GlassCard className="h-full p-5">
                <p className="text-sm text-slate-300">“{item.quote}”</p>
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.role}</p>
                </div>
              </GlassCard>
            </AnimatedContainer>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-sm text-slate-500 md:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Debug Security Protocol</p>
          <div className="flex gap-4">
            <Link to="/faq" className="hover:text-slate-300">
              Docs
            </Link>
            <a href="#how-it-works" className="hover:text-slate-300">
              How It Works
            </a>
            <Link to="/bounties" className="hover:text-slate-300">
              Platform
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
