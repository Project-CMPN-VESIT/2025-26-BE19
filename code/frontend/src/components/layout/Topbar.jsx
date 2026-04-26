import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, FileWarning, MessageSquare, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import GlowButton from '../ui/GlowButton';

export default function Topbar({ title, subtitle, actions }) {
  const navigate = useNavigate();
  const { account, login, userProfile } = useAuth();
  const [notifications, setNotifications] = React.useState([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!account) return undefined;

    async function fetchNotifs() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', account)
        .order('created_at', { ascending: false })
        .limit(12);
      setNotifications(data || []);
    }

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [account]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const markAllAsRead = async () => {
    if (!account || unreadCount === 0) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', account);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const iconForType = (type) => {
    if (type === 'new_report') return <MessageSquare className="h-4 w-4 text-cyan-300" />;
    if (type === 'report_accepted') return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
    return <FileWarning className="h-4 w-4 text-rose-300" />;
  };

  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/45 px-4 py-4 backdrop-blur-xl md:px-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <div className="relative">
            <button
              type="button"
              className="relative rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-200 transition hover:bg-white/10"
              onClick={async () => {
                const next = !open;
                setOpen(next);
                if (next) await markAllAsRead();
              }}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            <AnimatePresence>
              {open ? (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="glass-card absolute right-0 top-12 z-40 max-h-96 w-80 overflow-hidden"
                >
                  <div className="border-b border-white/10 p-3 text-xs uppercase tracking-[0.2em] text-slate-400">Live Alerts</div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-slate-400">No notifications yet.</p>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`flex w-full gap-3 border-b border-white/5 px-3 py-3 text-left transition hover:bg-white/5 ${
                            item.is_read ? 'bg-transparent' : 'bg-cyan-500/8'
                          }`}
                          onClick={() => {
                            setOpen(false);
                            if (item.bounty_id) {
                              navigate(`/bounty/${item.bounty_id}${item.type === 'new_report' ? '/reports' : ''}`);
                            }
                          }}
                        >
                          {iconForType(item.type)}
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-200">{item.message}</p>
                            <p className="mt-1 text-[11px] text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <Link to="/profile" onClick={() => setOpen(false)} className="block border-t border-white/10 p-3 text-center text-xs text-cyan-300">
                    Open Activity Center
                  </Link>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {account ? (
            <div className="flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
              <Wallet className="h-3.5 w-3.5" />
              <span>{userProfile?.name || `${account.slice(0, 6)}...${account.slice(-4)}`}</span>
            </div>
          ) : (
            <GlowButton onClick={login} className="text-xs uppercase tracking-[0.18em]">
              Connect Wallet
            </GlowButton>
          )}
        </div>
      </div>
    </div>
  );
}
