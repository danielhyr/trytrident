-- ============================================================
-- Phase 4: Content Studio
-- Tables: content_template, content_template_version, content_asset
-- Depends on: 001_auth_foundation (tenant, user_tenant)
--             003_data_ingestion (set_updated_at trigger function)
-- ============================================================

-- ============================================================
-- 1. content_template — one row per piece of content
-- ============================================================

create table public.content_template (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenant(id) on delete cascade,
  name             text not null,
  description      text,
  channel          text not null check (channel in ('email', 'sms', 'push')),
  status           text not null default 'draft'
                   check (status in ('draft', 'active', 'archived')),

  -- Email-specific
  subject          text,
  preheader        text,

  -- Body storage (all channels)
  body_json        jsonb,         -- editor state: MJML source for email, structured object for SMS/push
  body_html        text,          -- compiled HTML (email only)
  body_text        text,          -- plain text (all channels)

  -- Push-specific
  push_title       text,
  push_image_url   text,
  push_click_action text,

  -- Template metadata
  liquid_variables text[],        -- extracted variable names for UI
  tags             text[],

  created_by       text not null default 'user',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.content_template enable row level security;

-- Listing index: templates by channel and status
create index content_template_tenant_channel_status_idx
  on public.content_template (tenant_id, channel, status);

-- Sort index: recent templates
create index content_template_tenant_updated_idx
  on public.content_template (tenant_id, updated_at desc);

-- ============================================================
-- 2. content_template_version — version history
-- ============================================================

create table public.content_template_version (
  id               uuid primary key default gen_random_uuid(),
  template_id      uuid not null references public.content_template(id) on delete cascade,
  tenant_id        uuid not null references public.tenant(id) on delete cascade,
  version_number   integer not null,
  snapshot         jsonb not null,    -- full template state at this version
  change_summary   text,
  created_by       text not null default 'user',
  created_at       timestamptz not null default now()
);

alter table public.content_template_version enable row level security;

-- Index: versions for a template
create index content_template_version_template_idx
  on public.content_template_version (template_id, version_number desc);

-- ============================================================
-- 3. content_asset — uploaded files
-- ============================================================

create table public.content_asset (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenant(id) on delete cascade,
  name             text not null,
  file_path        text not null,
  public_url       text not null,
  mime_type        text not null,
  file_size_bytes  integer,
  dimensions       jsonb,           -- { width: number, height: number }
  tags             text[],
  uploaded_by      text not null default 'user',
  created_at       timestamptz not null default now()
);

alter table public.content_asset enable row level security;

-- Index: assets for a tenant
create index content_asset_tenant_idx
  on public.content_asset (tenant_id, created_at desc);

-- ============================================================
-- RLS Policies — content_template
-- ============================================================

create policy "Tenant members can view templates"
  on public.content_template for select
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

create policy "Tenant admins can create templates"
  on public.content_template for insert
  with check (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Tenant admins can update templates"
  on public.content_template for update
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Tenant admins can delete templates"
  on public.content_template for delete
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- RLS Policies — content_template_version
-- ============================================================

create policy "Tenant members can view template versions"
  on public.content_template_version for select
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

create policy "Tenant admins can create template versions"
  on public.content_template_version for insert
  with check (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- RLS Policies — content_asset
-- ============================================================

create policy "Tenant members can view assets"
  on public.content_asset for select
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

create policy "Tenant admins can create assets"
  on public.content_asset for insert
  with check (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Tenant admins can delete assets"
  on public.content_asset for delete
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- Updated_at trigger (reuses function from 003_data_ingestion)
-- ============================================================

create trigger content_template_updated_at
  before update on public.content_template
  for each row execute function public.set_updated_at();
