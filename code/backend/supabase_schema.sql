-- Debug Platform: Production-oriented schema + RLS
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Core users
-- ---------------------------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique not null,
  role text not null check (role in ('researcher', 'organization', 'admin')),
  name text,
  email text,
  auth_nonce text,
  auth_nonce_expires_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_wallet_address on users(wallet_address);
create index if not exists idx_users_role on users(role);

-- ---------------------------------------------------------------------------
-- Bounties
-- ---------------------------------------------------------------------------
create table if not exists bounties (
  id uuid primary key default gen_random_uuid(),
  onchain_id bigint,
  contract_address text unique not null,
  tx_hash text,
  org_address text not null,
  created_by text not null,
  title text not null,
  metadata_uri text,
  reward numeric(30, 10) not null default 0,
  severity text check (severity in ('low', 'medium', 'high', 'critical')) default 'medium',
  status text not null check (status in ('draft', 'active', 'closed', 'archived')) default 'draft',
  onchain_status text,
  last_funded_at timestamptz,
  last_funding_tx text,
  close_tx_hash text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bounties_status on bounties(status);
create index if not exists idx_bounties_org on bounties(org_address);
create index if not exists idx_bounties_reward on bounties(reward);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  bounty_id uuid not null references bounties(id) on delete cascade,
  reporter_address text not null,
  contract_address text not null,
  onchain_report_id bigint,
  onchain_tx_hash text,
  report_hash text not null,
  title text not null,
  description text not null,
  steps text,
  poc text,
  impact text,
  attachments text[] default '{}',
  status text not null check (status in ('submitted', 'approved', 'rejected', 'paid', 'disputed')) default 'submitted',
  onchain_status text,
  triage_status text check (triage_status in ('queued', 'processing', 'completed', 'failed')) default 'queued',
  ai_score numeric(10, 4),
  ai_severity text check (ai_severity in ('low', 'medium', 'high', 'critical')),
  ai_summary text,
  ai_recommendation text,
  duplicate_flag boolean default false,
  duplicate_score numeric(10, 4),
  duplicate_reason text,
  payout_amount_eth numeric(30, 10),
  payout_amount_wei text,
  approval_tx_hash text,
  rejection_tx_hash text,
  payout_tx_hash text,
  rejection_reason text,
  triaged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reports_bounty_id on reports(bounty_id);
create index if not exists idx_reports_status on reports(status);
create index if not exists idx_reports_onchain_report_id on reports(onchain_report_id);
create index if not exists idx_reports_duplicate_flag on reports(duplicate_flag);

-- ---------------------------------------------------------------------------
-- Payouts
-- ---------------------------------------------------------------------------
create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete set null,
  bounty_id uuid references bounties(id) on delete set null,
  user_address text not null,
  contract_address text not null,
  tx_hash text unique not null,
  amount_eth numeric(30, 10),
  amount_wei text,
  status text not null check (status in ('queued', 'released', 'failed')) default 'released',
  created_at timestamptz not null default now()
);

create index if not exists idx_payouts_user on payouts(user_address);
create index if not exists idx_payouts_bounty on payouts(bounty_id);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_address text not null,
  category text not null,
  title text not null,
  message text not null,
  bounty_id uuid references bounties(id) on delete cascade,
  report_id uuid references reports(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on notifications(user_address);
create index if not exists idx_notifications_read on notifications(is_read);

-- ---------------------------------------------------------------------------
-- Indexer / transactions
-- ---------------------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  tx_hash text not null,
  log_index integer not null,
  block_number bigint not null,
  event_name text not null,
  contract_address text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tx_hash, log_index)
);

create index if not exists idx_transactions_block on transactions(block_number);
create index if not exists idx_transactions_event on transactions(event_name);

create table if not exists indexer_state (
  key text primary key,
  last_processed_block bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Trigger helper for updated_at
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at before update on users for each row execute function set_updated_at();

drop trigger if exists trg_bounties_updated_at on bounties;
create trigger trg_bounties_updated_at before update on bounties for each row execute function set_updated_at();

drop trigger if exists trg_reports_updated_at on reports;
create trigger trg_reports_updated_at before update on reports for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS policies
-- Assumes JWT contains wallet_address + role claims for API access.
-- ---------------------------------------------------------------------------
alter table users enable row level security;
alter table bounties enable row level security;
alter table reports enable row level security;
alter table payouts enable row level security;
alter table notifications enable row level security;
alter table transactions enable row level security;
alter table indexer_state enable row level security;

drop policy if exists users_self_read on users;
create policy users_self_read on users
for select using (wallet_address = lower(coalesce(auth.jwt() ->> 'wallet_address', '')));

drop policy if exists users_self_update on users;
create policy users_self_update on users
for update using (wallet_address = lower(coalesce(auth.jwt() ->> 'wallet_address', '')));

drop policy if exists bounties_public_read on bounties;
create policy bounties_public_read on bounties
for select using (true);

drop policy if exists bounties_org_write on bounties;
create policy bounties_org_write on bounties
for update using (
  org_address = lower(coalesce(auth.jwt() ->> 'wallet_address', ''))
  or coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

drop policy if exists reports_visibility on reports;
create policy reports_visibility on reports
for select using (
  reporter_address = lower(coalesce(auth.jwt() ->> 'wallet_address', ''))
  or exists (
    select 1 from bounties b
    where b.id = reports.bounty_id
      and b.org_address = lower(coalesce(auth.jwt() ->> 'wallet_address', ''))
  )
  or coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

drop policy if exists reports_researcher_insert on reports;
create policy reports_researcher_insert on reports
for insert with check (
  reporter_address = lower(coalesce(auth.jwt() ->> 'wallet_address', ''))
);

drop policy if exists payouts_owner_read on payouts;
create policy payouts_owner_read on payouts
for select using (
  user_address = lower(coalesce(auth.jwt() ->> 'wallet_address', ''))
  or coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

drop policy if exists notifications_owner_read on notifications;
create policy notifications_owner_read on notifications
for select using (
  user_address = lower(coalesce(auth.jwt() ->> 'wallet_address', ''))
);

-- Indexer and transaction tables should be backend-service only.
drop policy if exists deny_public_transactions on transactions;
create policy deny_public_transactions on transactions
for all using (false) with check (false);

drop policy if exists deny_public_indexer_state on indexer_state;
create policy deny_public_indexer_state on indexer_state
for all using (false) with check (false);
