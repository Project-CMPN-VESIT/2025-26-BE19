import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ethers } from 'ethers';
import { AlertTriangle, Coins, Eye, Globe, Layers, Plus, ShieldCheck, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { deployBountyEscrow } from '../lib/contractUtils';
import PlatformShell from '../components/layout/PlatformShell';
import GlassCard from '../components/ui/GlassCard';
import GlowButton from '../components/ui/GlowButton';

const vulnTypes = ['XSS', 'SQL Injection', 'IDOR', 'CSRF', 'RCE', 'Authentication Bypass', 'Info Disclosure'];

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
          <Icon className="h-4 w-4 text-cyan-300" />
        </div>
        <h3 className="text-lg">{title}</h3>
      </div>
      {description ? <p className="text-sm text-slate-400">{description}</p> : null}
    </div>
  );
}

export default function CreateBounty() {
  const { account, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [formData, setFormData] = React.useState({
    title: '',
    company_name: userProfile?.name || '',
    description: 'Welcome to our bug bounty program. We are looking for vulnerabilities in our core infrastructure...',
    reward_type: 'Fixed',
    min_reward: '0.05',
    max_reward: '5.0',
    reward_critical: '1.0',
    reward_high: '0.5',
    reward_medium: '0.1',
    reward_low: '0.01',
    domains: [],
    domainInput: '',
    in_scope: '## In Scope Targets\n- `*.debug-platform.io` (Main Infrastructure)\n- `api.debug-platform.io` (Public API)',
    out_of_scope: '## Out of Scope\n- Third-party SaaS providers\n- Social engineering/Phishing',
    allowed_vulns: ['XSS', 'SQL Injection', 'RCE'],
    rules: 'No automated scanners allowed. Please respect our rate limits.',
    policy: 'We will not initiate legal action against researchers who follow these guidelines.',
    safe_harbor: 'You are protected by our safe harbor policy if you report bugs responsibly.',
    guidelines: 'Please include detailed reproduction steps and a clear PoC script.',
    timeline: '3 Business Days',
    visibility: 'public',
    invited_users_input: '',
  });

  const update = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const toggleVuln = (value) =>
    setFormData((prev) => ({
      ...prev,
      allowed_vulns: prev.allowed_vulns.includes(value)
        ? prev.allowed_vulns.filter((item) => item !== value)
        : [...prev.allowed_vulns, value],
    }));

  const addDomain = () => {
    if (!formData.domainInput.trim()) return;
    setFormData((prev) => ({ ...prev, domains: [...prev.domains, prev.domainInput.trim()], domainInput: '' }));
  };

  const removeDomain = (index) => {
    setFormData((prev) => ({ ...prev, domains: prev.domains.filter((_, idx) => idx !== index) }));
  };

  const handlePublish = async (status) => {
    if (!formData.title || !formData.company_name) {
      alert('Program title and organization name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!window.ethereum) throw new Error('MetaMask is required for on-chain escrow deployment.');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      const balance = await provider.getBalance(signerAddress);
      const initialDeposit = formData.reward_critical || '0.1';
      const initialDepositWei = ethers.parseEther(initialDeposit.toString());

      if (balance < initialDepositWei && status === 'Active') {
        throw new Error(`Insufficient balance. Required ${initialDeposit} ETH.`);
      }

      let deployedAddress = '0x0000000000000000000000000000000000000000';
      if (status === 'Active') {
        deployedAddress = await deployBountyEscrow(signer, formData.title, initialDeposit);
      }

      const payload = {
        org_address: account,
        title: formData.title,
        company_name: formData.company_name,
        description: formData.description,
        escrow_amount: parseFloat(initialDeposit),
        contract_address: deployedAddress,
        is_active: status === 'Active',
        reward_type: formData.reward_type,
        min_reward: parseFloat(formData.min_reward) || 0,
        max_reward: parseFloat(formData.max_reward) || 0,
        reward_critical: parseFloat(formData.reward_critical) || 0,
        reward_high: parseFloat(formData.reward_high) || 0,
        reward_medium: parseFloat(formData.reward_medium) || 0,
        reward_low: parseFloat(formData.reward_low) || 0,
        domains: formData.domains,
        in_scope: formData.in_scope,
        out_of_scope: formData.out_of_scope,
        allowed_vulns: formData.allowed_vulns,
        rules: formData.rules,
        policy: formData.policy,
        safe_harbor: formData.safe_harbor,
        guidelines: formData.guidelines,
        timeline: formData.timeline,
        visibility: formData.visibility,
        invited_users: formData.invited_users_input
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      };

      const { error } = await supabase.from('bounties').insert([payload]);
      if (error) throw error;

      await supabase.rpc('increment_bounty_count', { user_addr: account });
      alert(status === 'Active' ? 'Bounty published and escrow deployed.' : 'Draft saved.');
      navigate('/bounties');
    } catch (error) {
      alert(error.message || 'Bounty deployment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PlatformShell title="Program Architect" subtitle="Configure a premium bounty program with escrow-backed payouts and AI-ready triage metadata.">
      <div className="grid gap-6 2xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <GlassCard className="p-6" hover={false}>
            <SectionTitle icon={Layers} title="Program Identity" description="Define the public-facing context for researchers." />
            <div className="grid gap-4 md:grid-cols-2">
              <input className="input-field" placeholder="Program Title" value={formData.title} onChange={(event) => update('title', event.target.value)} />
              <input className="input-field" placeholder="Organization Name" value={formData.company_name} onChange={(event) => update('company_name', event.target.value)} />
            </div>
            <textarea
              className="input-field mt-4 min-h-[140px]"
              placeholder="Executive summary"
              value={formData.description}
              onChange={(event) => update('description', event.target.value)}
            />
          </GlassCard>

          <GlassCard className="p-6" hover={false}>
            <SectionTitle icon={Coins} title="Reward Matrix" description="Set severity payout bands and escrow funding defaults." />
            <div className="grid gap-4 md:grid-cols-3">
              <select className="input-field" value={formData.reward_type} onChange={(event) => update('reward_type', event.target.value)}>
                <option value="Fixed">Fixed</option>
                <option value="Range">Range</option>
              </select>
              <input className="input-field" value={formData.min_reward} onChange={(event) => update('min_reward', event.target.value)} placeholder="Min ETH" />
              <input className="input-field" value={formData.max_reward} onChange={(event) => update('max_reward', event.target.value)} placeholder="Max ETH" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <input className="input-field" value={formData.reward_critical} onChange={(event) => update('reward_critical', event.target.value)} placeholder="Critical" />
              <input className="input-field" value={formData.reward_high} onChange={(event) => update('reward_high', event.target.value)} placeholder="High" />
              <input className="input-field" value={formData.reward_medium} onChange={(event) => update('reward_medium', event.target.value)} placeholder="Medium" />
              <input className="input-field" value={formData.reward_low} onChange={(event) => update('reward_low', event.target.value)} placeholder="Low" />
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover={false}>
            <SectionTitle icon={Target} title="Scope & Severity Focus" description="Set in-scope assets, exclusions, and target classes." />
            <div className="flex gap-2">
              <input
                className="input-field"
                value={formData.domainInput}
                onChange={(event) => update('domainInput', event.target.value)}
                placeholder="Add domain / repo"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addDomain();
                  }
                }}
              />
              <GlowButton variant="secondary" onClick={addDomain} className="text-xs uppercase tracking-[0.18em]">
                <Plus className="h-4 w-4" />
                Add
              </GlowButton>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {formData.domains.map((domain, index) => (
                <button key={`${domain}-${index}`} type="button" onClick={() => removeDomain(index)} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  {domain} ×
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <textarea className="input-field min-h-[110px]" value={formData.in_scope} onChange={(event) => update('in_scope', event.target.value)} />
              <textarea className="input-field min-h-[110px]" value={formData.out_of_scope} onChange={(event) => update('out_of_scope', event.target.value)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {vulnTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleVuln(type)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    formData.allowed_vulns.includes(type) ? 'border-cyan-300/55 bg-cyan-400/20 text-cyan-100' : 'border-white/15 bg-white/5 text-slate-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover={false}>
            <SectionTitle icon={ShieldCheck} title="Policy & Access" description="Safe harbor, submission guidance, and private invite controls." />
            <textarea className="input-field min-h-[100px]" value={formData.rules} onChange={(event) => update('rules', event.target.value)} />
            <textarea className="input-field mt-3 min-h-[100px]" value={formData.safe_harbor} onChange={(event) => update('safe_harbor', event.target.value)} />
            <textarea className="input-field mt-3 min-h-[100px]" value={formData.guidelines} onChange={(event) => update('guidelines', event.target.value)} />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input className="input-field" value={formData.timeline} onChange={(event) => update('timeline', event.target.value)} placeholder="Average Response Timeline" />
              <select className="input-field" value={formData.visibility} onChange={(event) => update('visibility', event.target.value)}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            {formData.visibility === 'private' ? (
              <textarea
                className="input-field mt-3 min-h-[100px]"
                value={formData.invited_users_input}
                onChange={(event) => update('invited_users_input', event.target.value)}
                placeholder="Whitelist wallet addresses (comma separated)"
              />
            ) : null}
          </GlassCard>

          <div className="flex flex-wrap gap-3">
            <GlowButton variant="secondary" onClick={() => handlePublish('Draft')} disabled={isSubmitting} className="text-xs uppercase tracking-[0.18em]">
              Save Draft
            </GlowButton>
            <GlowButton onClick={() => handlePublish('Active')} disabled={isSubmitting} className="text-xs uppercase tracking-[0.18em]">
              {isSubmitting ? 'Deploying...' : 'Publish & Deploy Escrow'}
            </GlowButton>
          </div>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-5" hover={false}>
            <div className="mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-cyan-300" />
              <p className="kicker">Live Preview</p>
            </div>
            <h3 className="text-2xl">{formData.title || 'Untitled Program'}</h3>
            <p className="mt-1 text-sm text-slate-400">{formData.company_name || 'Organization'}</p>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reward Envelope</p>
              <div className="mt-2 text-xl font-semibold text-white">
                {formData.min_reward} - {formData.max_reward} ETH
              </div>
              <p className="mt-1 text-xs text-slate-400">Critical payout locked as initial escrow deposit.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {formData.allowed_vulns.map((type) => (
                <span key={type} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  {type}
                </span>
              ))}
            </div>
            <div className="md-preview mt-4 rounded-xl border border-white/10 bg-black/25 p-4 text-sm">
              <ReactMarkdown>{formData.description}</ReactMarkdown>
            </div>
          </GlassCard>

          <GlassCard className="p-5" hover={false}>
            <div className="mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-cyan-300" />
              <p className="text-sm text-slate-300">Visibility</p>
            </div>
            <p className="text-lg text-white">{formData.visibility === 'public' ? 'Public Recruitment' : 'Private Invite'}</p>
            <p className="mt-2 text-sm text-slate-400">
              {formData.visibility === 'public'
                ? 'Any connected researcher can discover and submit findings.'
                : 'Only whitelisted wallet addresses can access this program.'}
            </p>
          </GlassCard>

          <GlassCard className="border-amber-400/30 bg-amber-500/10 p-5" hover={false}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-200" />
              <div>
                <p className="text-sm text-amber-100">Escrow reminder</p>
                <p className="mt-1 text-xs text-amber-200/90">
                  Publishing will trigger a contract deployment and lock the configured critical reward amount.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </PlatformShell>
  );
}
