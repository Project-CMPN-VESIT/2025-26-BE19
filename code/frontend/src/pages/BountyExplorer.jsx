import React from 'react';
import { Link } from 'react-router-dom';
import { Filter, ListFilter, Orbit, Search, ShieldAlert, Sparkles, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import PlatformShell from '../components/layout/PlatformShell';
import GlassCard from '../components/ui/GlassCard';
import GlowButton from '../components/ui/GlowButton';
import StatCard from '../components/ui/StatCard';
import Skeleton from '../components/ui/Skeleton';
import SeverityBadge from '../components/ui/SeverityBadge';
import { useUIStore } from '../store/uiStore';

const severityLevels = ['Low', 'Medium', 'High', 'Critical'];

function inferHighestRewardSeverity(bounty) {
  const pairs = [
    { severity: 'Critical', value: Number(bounty.reward_critical || 0) },
    { severity: 'High', value: Number(bounty.reward_high || 0) },
    { severity: 'Medium', value: Number(bounty.reward_medium || 0) },
    { severity: 'Low', value: Number(bounty.reward_low || 0) },
  ];
  return pairs.sort((a, b) => b.value - a.value)[0].severity;
}

export default function BountyExplorer() {
  const { account, userProfile } = useAuth();
  const role = userProfile?.role || 'researcher';
  const [bounties, setBounties] = React.useState([]);
  const [reports, setReports] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const { bountyFilters, updateBountyFilters, resetBountyFilters } = useUIStore();

  React.useEffect(() => {
    async function fetchBounties() {
      setLoading(true);
      const [{ data: bountyData }, { data: reportData }] = await Promise.all([
        supabase.from('bounties').select('*').order('created_at', { ascending: false }),
        supabase.from('reports').select('*'),
      ]);

      const all = bountyData || [];
      const visible = all.filter((bounty) => {
        if (!bounty.visibility || bounty.visibility === 'public') return true;
        if (!account) return false;
        const viewer = account.toLowerCase();
        if (bounty.org_address?.toLowerCase() === viewer) return true;
        return bounty.invited_users?.some((address) => address?.toLowerCase() === viewer);
      });

      setBounties(visible);
      setReports(reportData || []);
      setLoading(false);
    }

    fetchBounties();
  }, [account]);

  const filteredBounties = React.useMemo(() => {
    return bounties.filter((bounty) => {
      const highestSeverity = inferHighestRewardSeverity(bounty);
      const rewardMax = Number(bounty.max_reward || bounty.reward_critical || bounty.escrow_amount || 0);
      const visibility = bounty.visibility || 'public';
      const matchesSearch =
        !searchTerm ||
        bounty.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bounty.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSeverity =
        bountyFilters.severities.length === 0 || bountyFilters.severities.includes(highestSeverity);
      const matchesVisibility = bountyFilters.visibility === 'all' || bountyFilters.visibility === visibility;
      const matchesReward = rewardMax >= bountyFilters.minReward && rewardMax <= bountyFilters.maxReward;
      return matchesSearch && matchesSeverity && matchesVisibility && matchesReward;
    });
  }, [bounties, bountyFilters, searchTerm]);

  const activeBountiesCount = bounties.filter((item) => item.is_active).length;
  const pendingReportsCount = reports.filter((item) => item.status === 'submitted' || item.status === 'pending').length;
  const escrowBalance = bounties.reduce((sum, item) => sum + Number(item.escrow_amount || 0), 0);
  const aiOperational = reports.length === 0 ? 'Idle' : 'Live';

  return (
    <PlatformShell
      title="Security Control Center"
      subtitle="Monitor live bounty flow, escrow liquidity, and AI-assisted triage status."
      actions={
        role === 'organization' ? (
          <GlowButton as={Link} to="/create-bounty" className="text-xs uppercase tracking-[0.18em]">
            Launch Program
          </GlowButton>
        ) : null
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active Bounties" value={activeBountiesCount} icon={ShieldAlert} tone="blue" loading={loading} />
          <StatCard label="Pending Reports" value={pendingReportsCount} icon={ListFilter} tone="violet" loading={loading} />
          <StatCard label="Escrow Balance" value={`${escrowBalance.toFixed(2)} ETH`} icon={Wallet} tone="cyan" loading={loading} />
          <StatCard label="AI Triage Status" value={aiOperational} icon={Sparkles} tone="blue" loading={loading} />
        </div>

        <GlassCard className="p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search organization, title, or scope..."
                className="input-field pl-10"
              />
            </div>
            <GlowButton variant="secondary" onClick={() => setShowFilters((prev) => !prev)} className="h-full text-xs uppercase tracking-[0.18em]">
              <Filter className="h-4 w-4" />
              Filters
            </GlowButton>
            <GlowButton variant="secondary" onClick={resetBountyFilters} className="h-full text-xs uppercase tracking-[0.18em]">
              Reset
            </GlowButton>
          </div>

          {showFilters ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 grid gap-4 rounded-xl border border-white/10 bg-black/25 p-4 md:grid-cols-3"
            >
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Severity</p>
                <div className="flex flex-wrap gap-2">
                  {severityLevels.map((severity) => {
                    const active = bountyFilters.severities.includes(severity);
                    return (
                      <button
                        key={severity}
                        type="button"
                        onClick={() =>
                          updateBountyFilters((prev) => ({
                            ...prev,
                            severities: active ? prev.severities.filter((item) => item !== severity) : [...prev.severities, severity],
                          }))
                        }
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          active ? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-100' : 'border-white/10 text-slate-400 hover:border-white/30'
                        }`}
                      >
                        {severity}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Visibility</p>
                <select
                  value={bountyFilters.visibility}
                  onChange={(event) => updateBountyFilters((prev) => ({ ...prev, visibility: event.target.value }))}
                  className="input-field"
                >
                  <option value="all">All</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Reward Range (ETH)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={bountyFilters.minReward}
                    onChange={(event) => updateBountyFilters((prev) => ({ ...prev, minReward: Number(event.target.value || 0) }))}
                    className="input-field"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min="0"
                    value={bountyFilters.maxReward}
                    onChange={(event) => updateBountyFilters((prev) => ({ ...prev, maxReward: Number(event.target.value || 0) }))}
                    className="input-field"
                    placeholder="Max"
                  />
                </div>
              </div>
            </motion.div>
          ) : null}
        </GlassCard>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {loading
            ? [1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-64" />)
            : filteredBounties.map((bounty) => {
                const highestSeverity = inferHighestRewardSeverity(bounty);
                const submissions = reports.filter((report) => report.bounty_id === bounty.id).length;
                return (
                  <GlassCard key={bounty.id} className="overflow-hidden" hover>
                    <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{bounty.company_name || 'Organization'}</p>
                        <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${bounty.is_active ? 'bg-emerald-500/15 text-emerald-200' : 'bg-slate-700/40 text-slate-300'}`}>
                          {bounty.is_active ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      <h3 className="line-clamp-1 text-lg">{bounty.title}</h3>
                    </div>
                    <div className="space-y-4 px-5 py-4">
                      <p className="line-clamp-2 text-sm text-slate-400">{bounty.description}</p>
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={highestSeverity} />
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-400">{(bounty.visibility || 'public').toUpperCase()}</span>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reward</p>
                          <p className="text-xl font-semibold text-white">
                            {Number(bounty.max_reward || bounty.reward_critical || bounty.escrow_amount || 0).toFixed(2)} ETH
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Submissions</p>
                          <p className="text-sm text-slate-200">{submissions}</p>
                        </div>
                      </div>
                      <GlowButton as={Link} to={`/bounty/${bounty.id}`} className="w-full text-xs uppercase tracking-[0.18em]">
                        Open Details
                        <Orbit className="h-4 w-4" />
                      </GlowButton>
                    </div>
                  </GlassCard>
                );
              })}
        </div>

        {!loading && filteredBounties.length === 0 ? (
          <GlassCard className="p-10 text-center" hover={false}>
            <h3 className="text-xl">No bounties match current filters</h3>
            <p className="mt-2 text-sm text-slate-400">Adjust severity, reward range, or visibility filters to widen results.</p>
          </GlassCard>
        ) : null}
      </div>
    </PlatformShell>
  );
}
