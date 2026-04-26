import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Briefcase, CheckSquare, FileText, Plus, Shield, Trophy, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import PlatformShell from '../components/layout/PlatformShell';
import GlassCard from '../components/ui/GlassCard';
import GlowButton from '../components/ui/GlowButton';
import StatCard from '../components/ui/StatCard';

export default function Profile() {
  const { account, userProfile } = useAuth();
  const role = userProfile?.role || 'researcher';
  const [activeTab, setActiveTab] = React.useState(role === 'researcher' ? 'Reports' : 'Bounties');
  const [bounties, setBounties] = React.useState([]);
  const [reports, setReports] = React.useState([]);

  React.useEffect(() => {
    async function fetchData() {
      if (!account) return;
      if (role === 'organization') {
        const [{ data: bountiesData }, { data: reportsData }] = await Promise.all([
          supabase.from('bounties').select('*').eq('org_address', account),
          supabase.from('reports').select('*, bounties!inner(org_address)').eq('bounties.org_address', account),
        ]);
        setBounties(bountiesData || []);
        setReports(reportsData || []);
      } else {
        const { data: reportsData } = await supabase.from('reports').select('*, bounties(title, company_name)').eq('researcher_address', account);
        setReports(reportsData || []);
      }
    }
    fetchData();
  }, [account, role]);

  const acceptedReports = reports.filter((item) => item.status === 'accepted').length;
  const pendingReports = reports.filter((item) => item.status === 'submitted' || item.status === 'pending').length;
  const earningsEth = reports.reduce((sum, item) => sum + Number(item.reward_amount || 0), 0).toFixed(2);

  return (
    <PlatformShell
      title="Identity & Performance"
      subtitle={`${role === 'organization' ? 'Organization host profile' : 'Security researcher profile'} • wallet ${account?.slice(0, 6)}...${account?.slice(-4)}`}
      actions={
        role === 'organization' ? (
          <GlowButton as={Link} to="/create-bounty" className="text-xs uppercase tracking-[0.18em]">
            <Plus className="h-4 w-4" />
            New Program
          </GlowButton>
        ) : null
      }
    >
      <div className="space-y-6">
        <GlassCard className="p-6" hover={false}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-gradient-to-r from-accent-blue to-accent-violet p-4">
                {role === 'organization' ? <Briefcase className="h-8 w-8 text-white" /> : <Shield className="h-8 w-8 text-white" />}
              </div>
              <div>
                <h2 className="text-2xl">{userProfile?.name || 'Anonymous Profile'}</h2>
                <p className="text-sm text-slate-400">{userProfile?.email || 'No email configured'}</p>
                <p className="mt-1 text-xs text-slate-500">Role locked at onboarding: {role}</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-slate-300">
              <UserRound className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />
              Joined Mar 2026
            </div>
          </div>
        </GlassCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {role === 'researcher' ? (
            <>
              <StatCard label="Reports Submitted" value={reports.length} icon={FileText} tone="blue" />
              <StatCard label="Accepted Reports" value={acceptedReports} icon={CheckSquare} tone="cyan" />
              <StatCard label="Pending Reviews" value={pendingReports} icon={Activity} tone="violet" />
              <StatCard label="Earnings" value={`${earningsEth} ETH`} icon={Trophy} tone="blue" />
            </>
          ) : (
            <>
              <StatCard label="Programs" value={bounties.length} icon={Briefcase} tone="blue" />
              <StatCard label="Reports Received" value={reports.length} icon={FileText} tone="cyan" />
              <StatCard label="Pending Queue" value={pendingReports} icon={Activity} tone="violet" />
              <StatCard label="Acceptance Rate" value={`${reports.length ? Math.round((acceptedReports / reports.length) * 100) : 0}%`} icon={CheckSquare} tone="blue" />
            </>
          )}
        </div>

        <GlassCard className="p-5" hover={false}>
          <div className="mb-4 flex flex-wrap gap-2">
            {(role === 'researcher' ? ['Reports', 'Activity'] : ['Bounties', 'Reports Received', 'Activity']).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] transition ${
                  activeTab === tab ? 'bg-cyan-400/20 text-cyan-100' : 'bg-white/5 text-slate-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {role === 'researcher' && activeTab === 'Reports' ? (
            <div className="space-y-2">
              {reports.length === 0 ? (
                <p className="text-sm text-slate-400">No reports submitted yet.</p>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm">
                    <div>
                      <p className="text-white">{report.title || report.report_desc?.slice(0, 70) || 'Untitled report'}</p>
                      <p className="text-xs text-slate-500">{report.bounties?.title || 'Unknown target'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{report.claimed_severity || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{new Date(report.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {role === 'organization' && activeTab === 'Bounties' ? (
            <div className="space-y-2">
              {bounties.length === 0 ? (
                <p className="text-sm text-slate-400">No bounty programs launched yet.</p>
              ) : (
                bounties.map((bounty) => (
                  <div key={bounty.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm">
                    <div>
                      <p className="text-white">{bounty.title}</p>
                      <p className="text-xs text-slate-500">{bounty.company_name || 'Organization'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] ${bounty.is_active ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-700/50 text-slate-300'}`}>
                        {bounty.is_active ? 'Active' : 'Draft'}
                      </span>
                      <GlowButton as={Link} to={`/bounty/${bounty.id}`} variant="secondary" className="px-3 py-1 text-[11px] uppercase tracking-[0.15em]">
                        Open
                      </GlowButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {role === 'organization' && activeTab === 'Reports Received' ? (
            <div className="space-y-2">
              {reports.length === 0 ? (
                <p className="text-sm text-slate-400">No incoming reports yet.</p>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm">
                    <div>
                      <p className="text-white">{report.title || report.report_desc?.slice(0, 70) || 'Untitled report'}</p>
                      <p className="text-xs text-slate-500">{report.researcher_address}</p>
                    </div>
                    <span className="text-xs text-slate-400">{report.status || 'submitted'}</span>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {activeTab === 'Activity' ? (
            <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-slate-400">
              Activity feed is available through the topbar notification center and profile history stream.
            </div>
          ) : null}
        </GlassCard>
      </div>
    </PlatformShell>
  );
}
