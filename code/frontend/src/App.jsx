import React from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import BackgroundScene from './components/layout/BackgroundScene';
import LandingPage from './pages/LandingPage';
import BountyExplorer from './pages/BountyExplorer';
import BountyDetails from './pages/BountyDetails';
import SubmitReport from './pages/SubmitReport';
import ViewReports from './pages/ViewReports';
import CreateBounty from './pages/CreateBounty';
import Profile from './pages/Profile';

function OnboardingModal() {
  const { account, isNewUser, setIsNewUser, fetchUserProfile } = useAuth();
  const navigate = useNavigate();

  const handleComplete = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');
    const role = formData.get('role');

    try {
      await supabase.from('users').upsert({ wallet_address: account, name, email, role });
      setIsNewUser(false);
      await fetchUserProfile(account);
      navigate('/bounties');
    } catch (error) {
      alert('Profile save failed. Supabase may be unreachable right now.');
    }
  };

  if (!isNewUser) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card w-full max-w-lg p-7"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet p-2">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="kicker">Onboarding</p>
            <h2 className="text-2xl font-semibold">Configure Your Debug Identity</h2>
          </div>
        </div>
        <p className="mb-6 text-sm text-slate-400">Set your role once to personalize your triage and bounty workflow.</p>
        <form onSubmit={handleComplete} className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="cursor-pointer rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200">
              <input type="radio" name="role" value="researcher" defaultChecked className="mr-2 accent-cyan-400" />
              Security Researcher
            </label>
            <label className="cursor-pointer rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200">
              <input type="radio" name="role" value="organization" className="mr-2 accent-cyan-400" />
              Organization Host
            </label>
          </div>
          <input name="name" type="text" required placeholder="Display Name / Alias" className="input-field" />
          <input name="email" type="email" placeholder="Optional Email" className="input-field" />
          <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-5 py-3 text-sm font-semibold text-white shadow-glow">
            Complete Setup
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function RouteWrapper({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function FAQ() {
  return (
    <div className="relative z-10 mx-auto max-w-4xl px-4 pb-20 pt-28 md:px-8">
      <div className="glass-card p-8">
        <p className="kicker">Guidelines</p>
        <h1 className="mt-2 text-3xl">FAQ & Protocol Notes</h1>
        <p className="mt-3 text-slate-300">
          Debug secures bounty payout flow through escrow contracts and combines that with AI triage to shorten review time.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { account } = useAuth();

  return (
    <div className="app-shell">
      <BackgroundScene />
      <div className="grain-overlay" />
      <OnboardingModal />

      <Routes>
        <Route
          path="/"
          element={
            <RouteWrapper>
              <LandingPage />
            </RouteWrapper>
          }
        />
        <Route
          path="/bounties"
          element={
            <RouteWrapper>
              <BountyExplorer />
            </RouteWrapper>
          }
        />
        <Route
          path="/bounty/:id"
          element={
            <RouteWrapper>
              <BountyDetails />
            </RouteWrapper>
          }
        />
        <Route
          path="/bounty/:id/submit"
          element={
            <RouteWrapper>
              <SubmitReport />
            </RouteWrapper>
          }
        />
        <Route
          path="/bounty/:id/reports"
          element={
            <RouteWrapper>
              <ViewReports />
            </RouteWrapper>
          }
        />
        <Route
          path="/create-bounty"
          element={
            <RouteWrapper>
              <CreateBounty />
            </RouteWrapper>
          }
        />
        <Route
          path="/profile"
          element={
            <RouteWrapper>
              {account ? <Profile /> : <div className="relative z-10 px-6 pt-24 text-slate-300">Please connect wallet.</div>}
            </RouteWrapper>
          }
        />
        <Route
          path="/faq"
          element={
            <RouteWrapper>
              <FAQ />
            </RouteWrapper>
          }
        />
      </Routes>
    </div>
  );
}
