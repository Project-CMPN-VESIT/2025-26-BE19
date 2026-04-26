import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, Bot, CheckCircle2, ChevronLeft, ChevronRight, FileUp, Shield, Sparkles, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PlatformShell from '../components/layout/PlatformShell';
import GlassCard from '../components/ui/GlassCard';
import GlowButton from '../components/ui/GlowButton';
import SeverityBadge from '../components/ui/SeverityBadge';
import { useUIStore } from '../store/uiStore';

const steps = [
  { id: 1, label: 'Target' },
  { id: 2, label: 'Severity' },
  { id: 3, label: 'Evidence' },
  { id: 4, label: 'Review' },
];

function MarkdownBlock({ label, value, onChange, previewMode, setPreviewMode, placeholder }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm text-slate-300">{label}</label>
        <div className="flex rounded-lg border border-white/10 bg-black/25 p-1 text-xs">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className={`rounded px-2 py-1 ${!previewMode ? 'bg-cyan-400/20 text-cyan-100' : 'text-slate-400'}`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={`rounded px-2 py-1 ${previewMode ? 'bg-cyan-400/20 text-cyan-100' : 'text-slate-400'}`}
          >
            Preview
          </button>
        </div>
      </div>
      {!previewMode ? (
        <textarea className="input-field min-h-[130px]" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      ) : (
        <div className="md-preview min-h-[130px] rounded-xl border border-white/10 bg-black/30 p-4">
          <ReactMarkdown>{value || '*No content*'}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function SubmitReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useAuth();
  const { reportWizardStep, setReportWizardStep } = useUIStore();

  const [bounty, setBounty] = React.useState(null);
  const [existingReports, setExistingReports] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState({
    description: false,
    steps: false,
    poc: false,
    impact: false,
  });
  const [attachments, setAttachments] = React.useState([]);
  const [aiFeedback, setAiFeedback] = React.useState(null);
  const [duplicateFeedback, setDuplicateFeedback] = React.useState(null);
  const [analyzing, setAnalyzing] = React.useState(false);

  const [form, setForm] = React.useState({
    asset: '',
    endpoint: '',
    weaknessType: 'Cross-Site Scripting (XSS)',
    reproducibility: 'Always',
    cvss: { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'L', I: 'L', A: 'N' },
    reportTitle: '',
    description: '',
    steps: '',
    poc: '',
    impact: '',
  });

  React.useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      const [{ data: bountyData }, { data: reportsData }] = await Promise.all([
        supabase.from('bounties').select('*').eq('id', id).single(),
        supabase.from('reports').select('id,title,description').eq('bounty_id', id),
      ]);
      setBounty(bountyData);
      setExistingReports(reportsData || []);
      if (bountyData?.domains?.[0]) {
        setForm((prev) => ({ ...prev, asset: bountyData.domains[0] }));
      }
      setLoading(false);
    }
    fetchDetails();
  }, [id]);

  const cvssVector = `CVSS:3.1/AV:${form.cvss.AV}/AC:${form.cvss.AC}/PR:${form.cvss.PR}/UI:${form.cvss.UI}/S:${form.cvss.S}/C:${form.cvss.C}/I:${form.cvss.I}/A:${form.cvss.A}`;
  const cvssScore = React.useMemo(() => {
    let score = 4.0;
    if (form.cvss.AV === 'N') score += 1.0;
    if (form.cvss.AC === 'L') score += 1.0;
    if (form.cvss.PR === 'N') score += 1.0;
    if (form.cvss.UI === 'N') score += 0.5;
    if (form.cvss.C === 'H') score += 1.5;
    if (form.cvss.I === 'H') score += 1.5;
    if (form.cvss.A === 'H') score += 1.0;
    if (form.cvss.S === 'C') score += 1.0;
    return Math.min(10, score).toFixed(1);
  }, [form.cvss]);

  const claimedSeverity = cvssScore >= 9 ? 'Critical' : cvssScore >= 7 ? 'High' : cvssScore >= 4 ? 'Medium' : 'Low';

  React.useEffect(() => {
    const ready = form.reportTitle && form.description && form.poc;
    if (!ready) return;

    const timer = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const analysisResponse = await fetch('http://localhost:3001/api/ai/analyze-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.reportTitle,
            description: form.description,
            steps: form.steps,
            poc: form.poc,
            impact: form.impact,
          }),
        });
        const analysisData = await analysisResponse.json();
        setAiFeedback(analysisData);

        const duplicateResponse = await fetch('http://localhost:3001/api/ai/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentReport: { title: form.reportTitle, description: form.description },
            existingReports,
          }),
        });
        const duplicateData = await duplicateResponse.json();
        setDuplicateFeedback(duplicateData);
      } catch {
        // Keep form usable even if AI service is unavailable.
      } finally {
        setAnalyzing(false);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [existingReports, form.description, form.impact, form.poc, form.reportTitle, form.steps]);

  const onDrop = (files) => {
    const next = Array.from(files || []);
    setAttachments((prev) => [...prev, ...next]);
  };

  const nextStep = () => setReportWizardStep(Math.min(4, reportWizardStep + 1));
  const previousStep = () => setReportWizardStep(Math.max(1, reportWizardStep - 1));

  const submitReport = async () => {
    if (!form.reportTitle || !form.description || !form.steps || !form.poc || !form.impact) {
      alert('Complete all required sections before submission.');
      return;
    }
    setIsSubmitting(true);
    const payloadData = {
      bounty_id: id,
      researcher_address: account,
      org_address: bounty.org_address,
      title: form.reportTitle,
      description: form.description,
      steps: form.steps,
      poc: form.poc,
      impact: form.impact,
      report_desc: `${form.reportTitle}\n\n${form.description}\n\n${form.steps}\n\n${form.poc}\n\n${form.impact}`,
      claimed_severity: claimedSeverity,
      status: 'submitted',
    };

    try {
      const { data: reportData, error: reportError } = await supabase.from('reports').insert([payloadData]).select().single();
      if (reportError) throw reportError;

      await supabase.rpc('increment_submitted_count', { user_addr: account });
      await supabase.from('notifications').insert([
        {
          user_id: bounty.org_address,
          type: 'new_report',
          message: `New Technical Report: ${form.reportTitle}`,
          bounty_id: id,
          report_id: reportData.id,
          is_read: false,
        },
      ]);

      alert('Report securely transmitted and queued for triage.');
      setReportWizardStep(1);
      navigate(`/bounty/${id}`);
    } catch (error) {
      alert(`Submission failed: ${error.message || 'Unknown error'}`);
      setIsSubmitting(false);
    }
  };

  if (loading || !bounty) {
    return (
      <PlatformShell title="Submit Report" subtitle="Loading target program...">
        <GlassCard className="p-8" hover={false}>
          <div className="h-6 w-52 animate-pulse rounded bg-white/10" />
        </GlassCard>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell title="Premium Report Wizard" subtitle={`Target: ${bounty.company_name || 'Organization'} • ${bounty.title}`}>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <GlassCard className="p-6" hover={false}>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {steps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setReportWizardStep(step.id)}
                  className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] transition ${
                    reportWizardStep === step.id ? 'bg-cyan-400/20 text-cyan-100' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {step.id}. {step.label}
                </button>
              ))}
            </div>

            {reportWizardStep === 1 ? (
              <div className="space-y-4">
                <h3 className="text-xl">Target Context</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <select className="input-field" value={form.asset} onChange={(event) => setForm((prev) => ({ ...prev, asset: event.target.value }))}>
                    {(bounty.domains || []).length > 0
                      ? bounty.domains.map((domain) => (
                          <option key={domain} value={domain}>
                            {domain}
                          </option>
                        ))
                      : [
                          <option key="other" value="Other">
                            Other
                          </option>,
                        ]}
                  </select>
                  <input
                    className="input-field"
                    placeholder="Affected endpoint"
                    value={form.endpoint}
                    onChange={(event) => setForm((prev) => ({ ...prev, endpoint: event.target.value }))}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <select className="input-field" value={form.weaknessType} onChange={(event) => setForm((prev) => ({ ...prev, weaknessType: event.target.value }))}>
                    {['Cross-Site Scripting (XSS)', 'SQL Injection', 'IDOR', 'CSRF', 'Remote Code Execution', 'Auth Bypass', 'Logic Flaw'].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input-field"
                    value={form.reproducibility}
                    onChange={(event) => setForm((prev) => ({ ...prev, reproducibility: event.target.value }))}
                  >
                    <option value="Always">Always</option>
                    <option value="Sometimes">Sometimes</option>
                    <option value="Rarely">Rarely</option>
                  </select>
                </div>
              </div>
            ) : null}

            {reportWizardStep === 2 ? (
              <div className="space-y-4">
                <h3 className="text-xl">Severity & CVSS Vector</h3>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{cvssVector}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <SeverityBadge severity={claimedSeverity} />
                    <span className="text-sm text-slate-300">Score: {cvssScore}</span>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ['AV', ['N', 'A']],
                    ['AC', ['L', 'H']],
                    ['PR', ['N', 'L']],
                    ['UI', ['N', 'R']],
                    ['S', ['U', 'C']],
                    ['C', ['N', 'L', 'H']],
                    ['I', ['N', 'L', 'H']],
                    ['A', ['N', 'L', 'H']],
                  ].map(([metric, options]) => (
                    <div key={metric} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-slate-500">{metric}</label>
                      <select
                        className="input-field"
                        value={form.cvss[metric]}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            cvss: { ...prev.cvss, [metric]: event.target.value },
                          }))
                        }
                      >
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {reportWizardStep === 3 ? (
              <div className="space-y-4">
                <h3 className="text-xl">Technical Evidence</h3>
                <input
                  className="input-field"
                  placeholder="Report title"
                  value={form.reportTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, reportTitle: event.target.value }))}
                />
                <MarkdownBlock
                  label="Description"
                  value={form.description}
                  onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
                  previewMode={previewMode.description}
                  setPreviewMode={(value) => setPreviewMode((prev) => ({ ...prev, description: value }))}
                  placeholder="Describe the vulnerability."
                />
                <MarkdownBlock
                  label="Steps to reproduce"
                  value={form.steps}
                  onChange={(value) => setForm((prev) => ({ ...prev, steps: value }))}
                  previewMode={previewMode.steps}
                  setPreviewMode={(value) => setPreviewMode((prev) => ({ ...prev, steps: value }))}
                  placeholder="1. Open...\n2. Trigger..."
                />
                <MarkdownBlock
                  label="Proof of concept"
                  value={form.poc}
                  onChange={(value) => setForm((prev) => ({ ...prev, poc: value }))}
                  previewMode={previewMode.poc}
                  setPreviewMode={(value) => setPreviewMode((prev) => ({ ...prev, poc: value }))}
                  placeholder="Include payloads or terminal output."
                />
                <MarkdownBlock
                  label="Impact"
                  value={form.impact}
                  onChange={(value) => setForm((prev) => ({ ...prev, impact: value }))}
                  previewMode={previewMode.impact}
                  setPreviewMode={(value) => setPreviewMode((prev) => ({ ...prev, impact: value }))}
                  placeholder="Explain attacker impact."
                />

                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    onDrop(event.dataTransfer.files);
                  }}
                  className="rounded-xl border border-dashed border-cyan-300/35 bg-cyan-500/10 p-6 text-center"
                >
                  <FileUp className="mx-auto h-6 w-6 text-cyan-200" />
                  <p className="mt-2 text-sm text-cyan-100">Drag and drop attachments</p>
                  <p className="mt-1 text-xs text-cyan-200/80">Screenshots, videos, logs (local draft only)</p>
                  <input
                    type="file"
                    multiple
                    className="mt-3 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-slate-200"
                    onChange={(event) => onDrop(event.target.files)}
                  />
                </div>
              </div>
            ) : null}

            {reportWizardStep === 4 ? (
              <div className="space-y-4">
                <h3 className="text-xl">Final Review</h3>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm text-slate-300">
                    <strong className="text-white">Title:</strong> {form.reportTitle || 'Untitled report'}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    <strong className="text-white">Severity:</strong> {claimedSeverity} ({cvssScore})
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    <strong className="text-white">Attachments:</strong> {attachments.length}
                  </p>
                </div>
                <GlowButton onClick={submitReport} disabled={isSubmitting} className="w-full text-xs uppercase tracking-[0.18em]">
                  {isSubmitting ? 'Submitting...' : 'Transmit Structured Report'}
                </GlowButton>
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <GlowButton variant="secondary" onClick={previousStep} className="text-xs uppercase tracking-[0.18em]">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </GlowButton>
              <GlowButton onClick={nextStep} className="text-xs uppercase tracking-[0.18em]">
                Next
                <ChevronRight className="h-4 w-4" />
              </GlowButton>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-5" hover={false}>
            <p className="kicker">AI Feedback</p>
            {analyzing ? <p className="mt-2 text-sm text-slate-400">Analyzing report draft...</p> : null}
            {aiFeedback ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-cyan-300" />
                  <span className="text-sm text-white">Severity: {aiFeedback.severity || claimedSeverity}</span>
                </div>
                <p className="text-sm text-slate-300">{aiFeedback.summary}</p>
                <p className="text-xs text-slate-400">Confidence: {aiFeedback.confidence || '--'}%</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">Fill evidence sections to activate live AI insights.</p>
            )}

            {duplicateFeedback?.isDuplicate ? (
              <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-500/10 p-3">
                <div className="flex items-center gap-2 text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  Possible duplicate detected
                </div>
                <p className="mt-1 text-xs text-amber-100/90">
                  Similarity: {duplicateFeedback.similarityScore}% • {duplicateFeedback.reasoning}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  No strong duplicate signals detected
                </div>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-5" hover={false}>
            <p className="kicker">Program Context</p>
            <h3 className="mt-1 text-lg">{bounty.company_name || 'Organization'}</h3>
            <p className="text-sm text-slate-400">{bounty.title}</p>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-cyan-300" />
                Domains in scope: {(bounty.domains || []).length}
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-300" />
                Program status: {bounty.is_active ? 'Active' : 'Closed'}
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                Claimed severity: {claimedSeverity}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5" hover={false}>
            <p className="kicker">Attachments</p>
            <div className="mt-3 space-y-2">
              {attachments.map((file, index) => (
                <div key={`${file.name}-${index}`} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-slate-300">
                  {file.name}
                </div>
              ))}
              {attachments.length === 0 ? <p className="text-sm text-slate-400">No files attached yet.</p> : null}
            </div>
          </GlassCard>
        </div>
      </div>
    </PlatformShell>
  );
}
