-- ============================================================
-- Phase 2: Journeys
-- Tables: journey, journey_enrollment, message, decision_log
-- Also: add sender config columns to tenant
-- Depends on: 001_auth_foundation (tenant, user_tenant)
--             003_data_ingestion (set_updated_at trigger function, contact, event)
--             006_content_studio (content_template)
-- ============================================================

-- ============================================================
-- 0. Add sender config columns to tenant
-- ============================================================

alter table public.tenant
  add column if not exists sendgrid_subuser   text,
  add column if not exists sendgrid_api_key   text,
  add column if not exists sender_email       text,
  add column if not exists sender_name        text;

-- ============================================================
-- 1. journey — one row per automation flow
-- ============================================================

create table public.journey (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenant(id) on delete cascade,
  name              text not null,
  description       text,
  graph             jsonb not null default '{"nodes":[],"edges":[]}',
  status            text not null default 'draft'
                    check (status in ('draft', 'active', 'paused', 'archived')),
  trigger_config    jsonb not null default '{}',
  entry_limit       integer,
  re_entry_allowed  boolean not null default false,
  created_by        text not null default 'user',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.journey enable row level security;

-- Listing index: journeys by status
create index journey_tenant_status_idx
  on public.journey (tenant_id, status);

-- Unique name per tenant (excluding archived)
create unique index journey_tenant_name_unique_idx
  on public.journey (tenant_id, name)
  where status != 'archived';

-- ============================================================
-- 2. journey_enrollment — contact progress through journey
-- ============================================================

create table public.journey_enrollment (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenant(id) on delete cascade,
  contact_id      uuid not null references public.contact(id) on delete cascade,
  journey_id      uuid not null references public.journey(id) on delete cascade,
  current_node_id text,
  status          text not null default 'active'
                  check (status in ('active', 'waiting', 'completed', 'exited')),
  wait_until      timestamptz,
  entered_at      timestamptz not null default now(),
  exit_reason     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.journey_enrollment enable row level security;

-- Lookup: enrollments for a journey by status
create index journey_enrollment_journey_status_idx
  on public.journey_enrollment (journey_id, status);

-- Dedup: one active/waiting enrollment per contact per journey
create unique index journey_enrollment_contact_journey_active_idx
  on public.journey_enrollment (contact_id, journey_id)
  where status in ('active', 'waiting');

-- Cron: find waiting enrollments ready to advance
create index journey_enrollment_waiting_idx
  on public.journey_enrollment (status, wait_until)
  where status = 'waiting';

-- ============================================================
-- 3. message — sent messages
-- ============================================================

create table public.message (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenant(id) on delete cascade,
  contact_id            uuid not null references public.contact(id) on delete cascade,
  journey_enrollment_id uuid references public.journey_enrollment(id) on delete set null,
  content_template_id   uuid references public.content_template(id) on delete set null,
  channel               text not null check (channel in ('email', 'sms', 'push')),
  subject               text,
  body_html             text,
  body_text             text,
  variant               text,
  status                text not null default 'queued'
                        check (status in ('queued', 'sent', 'delivered', 'opened',
                                          'clicked', 'bounced', 'failed', 'suppressed')),
  provider_message_id   text,
  sent_at               timestamptz,
  delivered_at          timestamptz,
  opened_at             timestamptz,
  clicked_at            timestamptz,
  bounced_at            timestamptz,
  revenue_attributed    numeric(12, 2) default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.message enable row level security;

-- Webhook correlation: look up message by provider ID
create index message_provider_message_id_idx
  on public.message (provider_message_id)
  where provider_message_id is not null;

-- Timeline: messages for a contact
create index message_contact_created_idx
  on public.message (contact_id, created_at desc);

-- Frequency cap: recent messages per contact per channel
create index message_contact_channel_recent_idx
  on public.message (contact_id, channel, created_at desc);

-- ============================================================
-- 4. decision_log — every decision for future bandit training
-- ============================================================

create table public.decision_log (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenant(id) on delete cascade,
  contact_id        uuid not null references public.contact(id) on delete cascade,
  event_id          uuid,
  contact_snapshot  jsonb,
  action_type       text not null,
  journey_id        uuid references public.journey(id) on delete set null,
  enrollment_id     uuid references public.journey_enrollment(id) on delete set null,
  message_id        uuid references public.message(id) on delete set null,
  channel           text,
  decision_method   text not null default 'rule_engine',
  decision_reason   text,

  -- Outcome fields (updated later by webhooks / attribution)
  outcome_opened       boolean,
  outcome_clicked      boolean,
  outcome_converted    boolean,
  outcome_revenue      numeric(12, 2),
  outcome_unsubscribed boolean,

  decided_at        timestamptz not null default now()
);

alter table public.decision_log enable row level security;

-- Analytics: decisions for a journey over time
create index decision_log_journey_decided_idx
  on public.decision_log (journey_id, decided_at desc);

-- Lookup: decisions for a contact
create index decision_log_contact_idx
  on public.decision_log (contact_id, decided_at desc);

-- ============================================================
-- RLS Policies — journey
-- ============================================================

create policy "Tenant members can view journeys"
  on public.journey for select
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

create policy "Tenant admins can create journeys"
  on public.journey for insert
  with check (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Tenant admins can update journeys"
  on public.journey for update
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Tenant admins can delete journeys"
  on public.journey for delete
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- RLS Policies — journey_enrollment
-- ============================================================

create policy "Tenant members can view enrollments"
  on public.journey_enrollment for select
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

create policy "Tenant admins can create enrollments"
  on public.journey_enrollment for insert
  with check (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Tenant admins can update enrollments"
  on public.journey_enrollment for update
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Tenant admins can delete enrollments"
  on public.journey_enrollment for delete
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- RLS Policies — message
-- ============================================================

create policy "Tenant members can view messages"
  on public.message for select
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

create policy "Tenant admins can create messages"
  on public.message for insert
  with check (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Tenant admins can update messages"
  on public.message for update
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- RLS Policies — decision_log
-- ============================================================

create policy "Tenant members can view decision logs"
  on public.decision_log for select
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

create policy "Tenant admins can create decision logs"
  on public.decision_log for insert
  with check (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Tenant admins can update decision logs"
  on public.decision_log for update
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- Updated_at triggers (reuses function from 003_data_ingestion)
-- ============================================================

create trigger journey_updated_at
  before update on public.journey
  for each row execute function public.set_updated_at();

create trigger journey_enrollment_updated_at
  before update on public.journey_enrollment
  for each row execute function public.set_updated_at();

create trigger message_updated_at
  before update on public.message
  for each row execute function public.set_updated_at();
