-- ============================================================
-- Phase 1: Data Ingestion Pipeline
-- Tables: raw_event, contact, event
-- Depends on: 001_auth_foundation (tenant table)
-- ============================================================

-- ============================================================
-- RAW_EVENT — durable buffer between webhook receipt and processing.
-- Pattern from Braze/Segment/RudderStack: accept fast, process later.
-- Webhook gateway inserts here and returns 200 immediately.
-- Event processor polls unprocessed rows asynchronously.
-- ============================================================

create table public.raw_event (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenant(id) on delete cascade,
  source           text not null
                   check (source in ('shopify', 'sendgrid', 'twilio', 'api', 'csv', 'segment')),
  event_type       text not null,                          -- raw source event type (e.g. "orders/create")
  idempotency_key  text,                                   -- source-provided dedup key (X-Shopify-Webhook-Id)
  payload          jsonb not null,                          -- original webhook payload, untouched
  processed        boolean not null default false,
  processing_error text,                                   -- null if no error
  received_at      timestamptz not null default now(),
  processed_at     timestamptz                             -- null until processed
);

alter table public.raw_event enable row level security;

-- Unique constraint for idempotency: same source + same key = duplicate
create unique index raw_event_idempotency_idx
  on public.raw_event (tenant_id, source, idempotency_key)
  where idempotency_key is not null;

-- Processing queue index: fast lookup of unprocessed events
create index raw_event_unprocessed_idx
  on public.raw_event (received_at asc)
  where processed = false;

-- Tenant partition index for cleanup/audit queries
create index raw_event_tenant_idx on public.raw_event (tenant_id, received_at desc);

-- ============================================================
-- CONTACT — unified customer profile.
-- Opinionated e-commerce defaults + jsonb overflow for custom data.
-- Identity resolution uses: external_id > email > phone.
-- ============================================================

create table public.contact (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenant(id) on delete cascade,
  external_id          text,                                -- Shopify customer ID (or other source system ID)
  email                text,
  phone                text,
  first_name           text,
  last_name            text,

  -- behavioral (updated by event processor on order events)
  total_orders         integer not null default 0,
  total_revenue        numeric(12,2) not null default 0,
  avg_order_value      numeric(12,2) not null default 0,
  last_order_at        timestamptz,
  first_order_at       timestamptz,

  -- engagement (recalculated by daily cron)
  engagement_score     integer not null default 0           -- 0-100
                       check (engagement_score between 0 and 100),
  lifecycle_stage      text not null default 'prospect'
                       check (lifecycle_stage in ('prospect', 'active', 'at_risk', 'lapsed', 'vip')),
  last_email_open_at   timestamptz,
  last_email_click_at  timestamptz,

  -- consent
  email_consent        boolean not null default false,
  sms_consent          boolean not null default false,
  consent_source       text,                                -- shopify_checkout | manual | import
  consent_timestamp    timestamptz,
  jurisdiction         text,                                -- US | CA | EU | UK | AU etc.

  -- extensibility
  custom_attributes    jsonb not null default '{}'::jsonb,   -- overflow for non-standard data

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.contact enable row level security;

-- Identity resolution indexes: each lookup path needs to be fast
create unique index contact_tenant_external_idx
  on public.contact (tenant_id, external_id)
  where external_id is not null;

create index contact_tenant_email_idx
  on public.contact (tenant_id, email)
  where email is not null;

create index contact_tenant_phone_idx
  on public.contact (tenant_id, phone)
  where phone is not null;

-- Lifecycle/engagement queries (segments, daily cron)
create index contact_lifecycle_idx
  on public.contact (tenant_id, lifecycle_stage, engagement_score);

-- ============================================================
-- EVENT — canonical event store.
-- Immutable, append-only. Normalizers translate source-specific
-- payloads into this canonical format.
-- ============================================================

create table public.event (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenant(id) on delete cascade,
  contact_id       uuid references public.contact(id) on delete set null,
  event_type       text not null,                          -- canonical: order.placed, cart.abandoned, email.opened, etc.
  event_data       jsonb not null default '{}'::jsonb,     -- standard payload (order total, product IDs, etc.)
  source           text not null                           -- shopify | sendgrid | twilio | internal | api
                   check (source in ('shopify', 'sendgrid', 'twilio', 'internal', 'api', 'segment')),
  raw_event_id     uuid references public.raw_event(id),   -- link back to original raw event for debugging
  created_at       timestamptz not null default now()
);

alter table public.event enable row level security;

-- Contact timeline queries
create index event_contact_timeline_idx
  on public.event (tenant_id, contact_id, created_at desc);

-- Event type queries (journey triggers: "all cart.abandoned events in last hour")
create index event_type_idx
  on public.event (tenant_id, event_type, created_at desc);

-- ============================================================
-- Tenant columns for Shopify integration
-- Add shopify_store_url, shopify_access_token, webhook_secret
-- to the existing tenant table.
-- ============================================================

alter table public.tenant
  add column if not exists shopify_store_url    text,
  add column if not exists shopify_access_token text,
  add column if not exists shopify_webhook_secret text,
  add column if not exists data_source          text default 'shopify_webhook'
    check (data_source in ('shopify_webhook', 'snowflake_cdi', 'bigquery_cdi', 'api'));

-- ============================================================
-- RLS Policies
-- ============================================================

-- raw_event: service role inserts (webhooks bypass RLS via service key).
-- Tenant members can read their own events for debugging.
create policy "Tenant members can view raw events"
  on public.raw_event for select
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

-- contact: tenant members can view their own contacts
create policy "Tenant members can view contacts"
  on public.contact for select
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

-- contact: tenant admins/owners can update contacts
create policy "Tenant admins can update contacts"
  on public.contact for update
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- event: tenant members can view their own events
create policy "Tenant members can view events"
  on public.event for select
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

-- ============================================================
-- Updated_at trigger for contact table
-- ============================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contact_updated_at
  before update on public.contact
  for each row execute function public.set_updated_at();
