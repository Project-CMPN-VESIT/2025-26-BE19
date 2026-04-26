import React from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, BadgeCheck, Building2, Calendar, Coins, Copy, ExternalLink, FileText, Globe, Plus, ShieldCheck, XOctagon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { closeEscrow, depositToEscrow } from '../lib/contractUtils';
import PlatformShell from '../components/layout/PlatformShell';
import GlassCard from '../components/ui/GlassCard';
import GlowButton from '../components/ui/GlowButton';
import SeverityBadge from '../components/ui/SeverityBadge';
import { useEthPrice } from '../hooks/useEthPrice';

function normalizeSeverityRows(bounty) {
  return [
    { severity: 'Critical', amount: Number(bounty.reward_critical || 0) },
    { severity: 'High', amount: Number(bounty.reward_high || 0) },
    { severity: 'Medium', amount: Number(bounty.reward_medium || 0) },
    { severity: 'Low', amount: Number(bounty.reward_low || 0) },
  ];
}

export default function BountyDetails() {
  const { id } = useParams();
  const { account, userProfile } = useAuth();
  const role = userProfile?.role || 'researcher';
  const [bounty, setBounty] = React.useState(null);
  const [reports, setReports] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { toInr } = useEthPrice();

  React.useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      const [{ data: bountyData }, { data: reportsData }] = await Promise.all([
        supabase.from('bounties').select('*').eq('id', id).single(),
        supabase.from('reports').select('*').eq('bounty_id', id).order('created_at', { ascending: false }),
      ]);
      setBounty(bountyData);
      setReports(reportsData || []);
      setLoading(false);
    }
    fetchDetails();
  }, [id]);

  const isOwner = Boolean(account && bounty && account.toLowerCase() === bounty.org_address?.toLowerCase());
  const severityRows = bounty ? normalizeSeverityRows(bounty) : [];
  const escrowTarget = severityRows.reduce((sum, row) => sum + row.amount, 0) || Number(bounty?.escrow_amount || 0);
  const currentEscrow = Number(bounty?.escrow_amount || 0);
  const escrowProgress = escrowTarget > 0 ? Math.min(100, (currentEscrow / escrowTarget) * 100) : 0;

  const timelineItems = [
    { label: 'Program Created', date: bounty?.created_at ? new Date(bounty.created_at).toLocaleDateString() : '-' },
    { label: 'Reports Received', date: `${reports.length}` },
    { label: 'Average Response SLA', date: bounty?.timeline || '3 business days' },
  ];

  const copyText = async (value) => {
    await navigator.clipboard.writeText(value);
    alert('Copied to clipboard');
  };

  if (loading || !bounty) {
    return (
      <PlatformShell title="Bounty Details" subtitle="Loading bounty metadata...">
        <GlassCard className="p-8" hover={false}>
          <div className="h-6 w-44 animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-white/10" />
        </GlassCard>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell
      title={bounty.title}
      subtitle={`${bounty.company_name || 'Organization'} • ${bounty.is_active ? 'Active Program' : 'Closed Program'}`}
      actions={
        role === 'researcher' && bounty.is_active ? (
          <GlowButton as={Link} to={`/bounty/${bounty.id}/submit`} className="text-xs uppercase tracking-[0.18em]">
            Submit Report
          </GlowButton>
        ) : null
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <GlassCard className="p-6" hover={false}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${bounty.is_active ? 'bg-emerald-500/15 text-emerald-200' : 'bg-slate-700/40 text-slate-300'}`}>
                {bounty.is_active ? 'Active' : 'Closed'}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">{(bounty.visibility || 'public').toUpperCase()}</span>
            </div>
            <div className="md-preview">
              <ReactMarkdown>{bounty.description || '*No description*'}</ReactMarkdown>
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover={false}>
            <h3 className="text-xl">Scope & Rules</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-emerald-200">
                  <ShieldCheck className="h-4 w-4" />
                  In Scope
                </div>
                <div className="space-y-2">
                  {(bounty.domains || []).map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => copyText(domain)}
                      className="flex w-full items-center justify-between rounded-lg border border-emerald-300/30 bg-black/30 px-3 py-2 text-left text-xs text-emerald-100"
                    >
                      <span className="truncate">{domain}</span>
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
                <div className="md-preview mt-3 text-sm">
                  <ReactMarkdown>{bounty.in_scope || '*No specific in-scope notes*'}</ReactMarkdown>
                </div>
              </div>
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-rose-200">
                  <AlertTriangle className="h-4 w-4" />
                  Out of Scope
                </div>
                <div className="md-preview text-sm">
                  <ReactMarkdown>{bounty.out_of_scope || '*No exclusions defined*'}</ReactMarkdown>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="kicker">Rules of Engagement</p>
                <div className="md-preview mt-2 text-sm">
                  <ReactMarkdown>{bounty.rules || 'No additional rules supplied.'}</ReactMarkdown>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="kicker">Safe Harbor</p>
                <div className="md-preview mt-2 text-sm">
                  <ReactMarkdown>{bounty.safe_harbor || 'Default safe harbor policy applies.'}</ReactMarkdown>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover={false}>
            <h3 className="text-xl">Reward Matrix</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {severityRows.map((row) => (
                <div key={row.severity} className="rounded-xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <SeverityBadge severity={row.severity} />
                    <span className="text-sm text-slate-400">~₹{toInr(row.amount)}</span>
                  </div>
                  <div className="text-2xl font-semibold text-white">{row.amount.toFixed(2)} ETH</div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover={false}>
            <h3 className="text-xl">Submission Timeline</h3>
            <div className="mt-4 space-y-3">
              {timelineItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="h-4 w-4 text-cyan-300" />
                    {item.label}
                  </div>
                  <span className="text-sm text-slate-200">{item.date}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Latest Submissions</p>
              <div className="space-y-2">
                {reports.slice(0, 4).map((report) => (
                  <Link
                    key={report.id}
                    to={`/bounty/${bounty.id}/reports`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
                  >
                    <span className="truncate">{report.title || report.report_desc?.slice(0, 50) || 'Report'}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                ))}
                {reports.length === 0 ? <p className="text-sm text-slate-400">No submissions yet.</p> : null}
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-5" hover={false}>
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet p-2">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-white">{bounty.company_name || 'Organization'}</p>
                <p className="text-xs text-slate-400">Verified host</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-cyan-300" />
                Contract: {bounty.contract_address?.slice(0, 10)}...
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-cyan-300" />
                Current escrow: {currentEscrow.toFixed(2)} ETH
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-300" />
                Reports: {reports.length}
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Escrow Status</p>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                  initial={{ width: '0%' }}
                  animate={{ width: `${escrowProgress}%` }}
                  transition={{ duration: 0.7 }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">{escrowProgress.toFixed(1)}% of target liquidity available.</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => copyText(bounty.contract_address)} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                Copy Contract
              </button>
              <button type="button" onClick={() => copyText(bounty.org_address)} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                Copy Owner
              </button>
            </div>
          </GlassCard>

          {role === 'researcher' ? (
            <GlassCard className="p-5" hover={false}>
              {bounty.is_active ? (
                <GlowButton as={Link} to={`/bounty/${bounty.id}/submit`} className="w-full text-xs uppercase tracking-[0.18em]">
                  Submit Report
                </GlowButton>
              ) : (
                <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                  This program is closed and no longer accepts reports.
                </p>
              )}
            </GlassCard>
          ) : null}

          {role === 'organization' ? (
            <GlassCard className="space-y-3 p-5" hover={false}>
              {isOwner ? (
                <>
                  <GlowButton as={Link} to={`/bounty/${bounty.id}/reports`} className="w-full text-xs uppercase tracking-[0.18em]">
                    Open Report Queue
                  </GlowButton>
                  <GlowButton
                    variant="secondary"
                    className="w-full text-xs uppercase tracking-[0.18em]"
                    disabled={isProcessing}
                    onClick={async () => {
                      const amount = prompt('Enter ETH amount to deposit:');
                      if (!amount) return;
                      setIsProcessing(true);
                      try {
                        const provider = new ethers.BrowserProvider(window.ethereum);
                        const signer = await provider.getSigner();
                        await depositToEscrow(signer, bounty.contract_address, amount);
                        alert('Funds deposited successfully.');
                        window.location.reload();
                      } catch (error) {
                        alert(error.message);
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Escrow Funds
                  </GlowButton>
                  {bounty.is_active ? (
                    <GlowButton
                      variant="danger"
                      className="w-full text-xs uppercase tracking-[0.18em]"
                      disabled={isProcessing}
                      onClick={async () => {
                        if (!confirm('Close bounty and refund remaining escrow?')) return;
                        setIsProcessing(true);
                        try {
                          const provider = new ethers.BrowserProvider(window.ethereum);
                          const signer = await provider.getSigner();
                          await closeEscrow(signer, bounty.contract_address);
                          await supabase.from('bounties').update({ is_active: false }).eq('id', bounty.id);
                          alert('Bounty closed.');
                          window.location.reload();
                        } catch (error) {
                          alert(error.message);
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                    >
                      <XOctagon className="h-4 w-4" />
                      Finalize & Close
                    </GlowButton>
                  ) : null}
                </>
              ) : (
                <p className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-slate-400">
                  You can only manage escrow and triage actions for bounties owned by your connected wallet.
                </p>
              )}
            </GlassCard>
          ) : null}

          <GlassCard className="p-5" hover={false}>
            <p className="kicker">Metadata</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Created</span>
                <span>{new Date(bounty.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Visibility</span>
                <span>{bounty.visibility || 'public'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Program URL</span>
                <a href="#" className="flex items-center gap-1 text-cyan-300">
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span>Docs</span>
                <a href="#" className="flex items-center gap-1 text-cyan-300">
                  <Globe className="h-3.5 w-3.5" />
                  View
                </a>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </PlatformShell>
  );
}
