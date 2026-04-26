import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ethers } from 'ethers';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Bot, CheckCircle2, Eye, Fingerprint, Shield, Sparkles, Terminal, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { payoutResearcher } from '../lib/contractUtils';
import PlatformShell from '../components/layout/PlatformShell';
import GlassCard from '../components/ui/GlassCard';
import GlowButton from '../components/ui/GlowButton';
import SeverityBadge from '../components/ui/SeverityBadge';

export default function ViewReports() {
  const { id } = useParams();
  const [bounty, setBounty] = React.useState(null);
  const [reports, setReports] = React.useState([]);
  const [selectedReport, setSelectedReport] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [aiAnalysis, setAiAnalysis] = React.useState(null);
  const [duplicateResult, setDuplicateResult] = React.useState(null);

  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [{ data: bountyData }, { data: reportsData }] = await Promise.all([
        supabase.from('bounties').select('*').eq('id', id).single(),
        supabase.from('reports').select('*').eq('bounty_id', id).order('created_at', { ascending: false }),
      ]);
      setBounty(bountyData);
      setReports(reportsData || []);
      setSelectedReport(reportsData?.[0] || null);
      setLoading(false);
    }
    loadData();
  }, [id]);

  const runAiAnalysis = async (report) => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    setDuplicateResult(null);

    try {
      const analysisResponse = await fetch('http://localhost:3001/api/ai/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: report.title || report.report_desc?.split('\n')[0],
          description: report.description || report.report_desc,
          steps: report.steps,
          poc: report.poc,
          impact: report.impact,
        }),
      });
      const analysisData = await analysisResponse.json();
      setAiAnalysis(analysisData);

      const duplicateResponse = await fetch('http://localhost:3001/api/ai/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentReport: { title: report.title, description: report.description },
          existingReports: reports.filter((item) => item.id !== report.id),
        }),
      });
      const duplicateData = await duplicateResponse.json();
      setDuplicateResult(duplicateData);
    } catch {
      alert('Could not connect to AI triage engine.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTriage = async (status, rejectionReason = '') => {
    if (!selectedReport || isProcessing) return;
    setIsProcessing(true);

    try {
      if (status === 'accepted') {
        const rewardAmt = prompt(
          'Confirm reward amount (ETH):',
          selectedReport.claimed_severity === 'Critical' ? bounty.reward_critical : bounty.reward_high,
        );
        if (!rewardAmt) {
          setIsProcessing(false);
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        await payoutResearcher(signer, bounty.contract_address, selectedReport.researcher_address, rewardAmt);

        await supabase
          .from('reports')
          .update({
            status: 'accepted',
            ai_feedback: `Accepted with ${rewardAmt} ETH reward.`,
          })
          .eq('id', selectedReport.id);

        await supabase.rpc('increment_accepted_count', {
          user_addr: selectedReport.researcher_address,
          earned_amt: parseFloat(rewardAmt),
        });

        await supabase.from('notifications').insert([
          {
            user_id: selectedReport.researcher_address,
            type: 'report_accepted',
            message: `ACCEPTED! ${bounty.title} reward: ${rewardAmt} ETH.`,
            bounty_id: id,
            report_id: selectedReport.id,
          },
        ]);

        alert('Payment successful and reputation updated.');
      } else {
        await supabase
          .from('reports')
          .update({
            status: 'rejected',
            ai_feedback: rejectionReason || 'Does not meet program criteria.',
          })
          .eq('id', selectedReport.id);
        alert('Report rejected and researcher notified.');
      }
      window.location.reload();
    } catch (error) {
      alert(`Action failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || !bounty) {
    return (
      <PlatformShell title="Report Triage Center" subtitle="Loading report queue...">
        <GlassCard className="p-8" hover={false}>
          <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
        </GlassCard>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell
      title="Report Triage Center"
      subtitle={`${bounty.title} • ${reports.length} report(s)`}
      actions={
        <GlowButton as={Link} to={`/bounty/${id}`} variant="secondary" className="text-xs uppercase tracking-[0.18em]">
          <ArrowLeft className="h-4 w-4" />
          Back to Bounty
        </GlowButton>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <GlassCard className="max-h-[calc(100vh-190px)] overflow-hidden" hover={false}>
          <div className="border-b border-white/10 p-4">
            <p className="kicker">Submission Vault</p>
            <p className="mt-1 text-sm text-slate-400">Select an entry for deep review.</p>
          </div>
          <div className="max-h-[calc(100vh-290px)] overflow-y-auto">
            {reports.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">No reports submitted yet.</p>
            ) : (
              reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => {
                    setSelectedReport(report);
                    setAiAnalysis(null);
                    setDuplicateResult(null);
                  }}
                  className={`w-full border-b border-white/10 px-4 py-3 text-left transition ${
                    selectedReport?.id === report.id ? 'bg-cyan-500/12' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <SeverityBadge severity={report.claimed_severity} />
                    <span className="text-xs text-slate-500">{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="line-clamp-1 text-sm text-white">{report.title || report.report_desc?.split('\n')[0] || 'Untitled report'}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {report.researcher_address?.slice(0, 6)}...{report.researcher_address?.slice(-4)}
                  </p>
                </button>
              ))
            )}
          </div>
        </GlassCard>

        {selectedReport ? (
          <div className="space-y-6">
            <GlassCard className="p-6" hover={false}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl">{selectedReport.title || selectedReport.report_desc?.split('\n')[0] || 'Report'}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    <Fingerprint className="mr-1 inline h-3.5 w-3.5" />
                    {selectedReport.researcher_address}
                  </p>
                </div>
                {selectedReport.status === 'submitted' ? (
                  <div className="flex gap-2">
                    <GlowButton
                      variant="danger"
                      className="text-xs uppercase tracking-[0.18em]"
                      onClick={() => handleTriage('rejected', prompt('Reason for rejection:') || '')}
                      disabled={isProcessing}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </GlowButton>
                    <GlowButton className="text-xs uppercase tracking-[0.18em]" onClick={() => handleTriage('accepted')} disabled={isProcessing}>
                      <CheckCircle2 className="h-4 w-4" />
                      Accept & Pay
                    </GlowButton>
                  </div>
                ) : (
                  <span className={`rounded-full px-3 py-1 text-xs uppercase ${selectedReport.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
                    {selectedReport.status}
                  </span>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="md-preview rounded-xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Description</p>
                  <ReactMarkdown>{selectedReport.description || selectedReport.report_desc || '*No description*'}</ReactMarkdown>
                </div>
                <div className="md-preview rounded-xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Impact</p>
                  <ReactMarkdown>{selectedReport.impact || '*No impact provided*'}</ReactMarkdown>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/35 p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <Terminal className="mr-1 inline h-3.5 w-3.5" />
                  Reproduction + PoC
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap text-sm text-cyan-200">{selectedReport.steps || selectedReport.poc || '*No PoC provided*'}</pre>
              </div>
            </GlassCard>

            <GlassCard className="p-6" hover={false}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="kicker">Gemini Triage</p>
                  <p className="text-sm text-slate-400">Run AI analysis and duplicate detection before payout.</p>
                </div>
                <GlowButton variant="secondary" onClick={() => runAiAnalysis(selectedReport)} className="text-xs uppercase tracking-[0.18em]" disabled={isAnalyzing}>
                  <Bot className="h-4 w-4" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </GlowButton>
              </div>

              {aiAnalysis ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Severity Forecast</p>
                    <p className="mt-1 text-lg text-cyan-100">
                      {aiAnalysis.severity} ({aiAnalysis.confidence}%)
                    </p>
                    <p className="mt-2 text-sm text-cyan-100/90">{aiAnalysis.summary}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recommendation</p>
                    <p className="mt-2 text-sm text-slate-300">{aiAnalysis.recommendation}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">AI triage not run yet.</p>
              )}

              {duplicateResult?.isDuplicate ? (
                <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  <AlertTriangle className="mr-1 inline h-4 w-4" />
                  Possible duplicate ({duplicateResult.similarityScore}%): {duplicateResult.reasoning}
                </div>
              ) : duplicateResult ? (
                <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  <Shield className="mr-1 inline h-4 w-4" />
                  No significant duplicate match detected.
                </div>
              ) : null}
            </GlassCard>

            <GlassCard className="p-6" hover={false}>
              <p className="kicker">Quick Signals</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-500">Claimed Severity</p>
                  <p className="mt-1 text-sm text-white">{selectedReport.claimed_severity}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="mt-1 text-sm text-white">{selectedReport.status || 'submitted'}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-500">Evidence</p>
                  <p className="mt-1 text-sm text-white">
                    <Eye className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />
                    Markdown + PoC
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-slate-400">
                <Sparkles className="mr-1 inline h-3.5 w-3.5 text-violet-300" />
                Payouts are executed on-chain via `approveAndPay` only after acceptance.
              </div>
            </GlassCard>
          </div>
        ) : (
          <GlassCard className="p-8" hover={false}>
            <p className="text-sm text-slate-400">Select a report from the queue to start triage.</p>
          </GlassCard>
        )}
      </div>
    </PlatformShell>
  );
}
