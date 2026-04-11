-- ============================================================
-- Phase 1.5: Segments & Audience
-- Tables: segment
-- Depends on: 001_auth_foundation (tenant, user_tenant)
-- ============================================================

create table public.segment (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenant(id) on delete cascade,
  name           text not null,
  description    text,
  rules          jsonb not null default '[]'::jsonb,
  status         text not null default 'active'
                 check (status in ('active', 'archived')),
  contact_count  integer not null default 0,
  created_by     text not null default 'user',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.segment enable row level security;

-- Unique segment names per tenant (among active segments)
create unique index segment_tenant_name_active_idx
  on public.segment (tenant_id, name)
  where status = 'active';

-- Listing index: active segments for a tenant
create index segment_tenant_status_idx
  on public.segment (tenant_id, status, created_at desc);

-- ============================================================
-- RLS Policies
-- ============================================================

create policy "Tenant members can view segments"
  on public.segment for select
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

create policy "Tenant admins can create segments"
  on public.segment for insert
  with check (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Tenant admins can update segments"
  on public.segment for update
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Tenant admins can delete segments"
  on public.segment for delete
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

create trigger segment_updated_at
  before update on public.segment
  for each row execute function public.set_updated_at();
