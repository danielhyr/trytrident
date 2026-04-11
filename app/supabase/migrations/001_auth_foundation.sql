-- ============================================================
-- Phase 0: Auth Foundation
-- Tables: tenant, user_tenant, invite
-- ============================================================

-- Tenant (one per organization)
create table public.tenant (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  domain      text,
  vertical    text,
  plan        text not null default 'standard',
  timezone    text not null default 'America/New_York',
  created_at  timestamptz not null default now()
);

alter table public.tenant enable row level security;

-- User ↔ Tenant junction (many-to-many)
create table public.user_tenant (
  user_id    uuid not null references auth.users(id) on delete cascade,
  tenant_id  uuid not null references public.tenant(id) on delete cascade,
  role       text not null default 'viewer'
             check (role in ('owner', 'admin', 'viewer')),
  joined_at  timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

alter table public.user_tenant enable row level security;

-- Invite
create table public.invite (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenant(id) on delete cascade,
  email       text not null,
  role        text not null default 'viewer'
              check (role in ('admin', 'viewer')),
  invited_by  uuid not null references auth.users(id),
  token       text not null default encode(gen_random_bytes(32), 'hex'),
  status      text not null default 'pending'
              check (status in ('pending', 'accepted', 'expired')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '7 days')
);

alter table public.invite enable row level security;

-- ============================================================
-- RLS Policies
-- ============================================================

-- tenant: visible to members only
create policy "Tenants visible to members"
  on public.tenant for select
  using (
    id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

-- tenant: insert allowed for any authenticated user (signup flow)
create policy "Authenticated users can create tenants"
  on public.tenant for insert
  with check (auth.uid() is not null);

-- user_tenant: users can see their own memberships
create policy "Users can see own memberships"
  on public.user_tenant for select
  using (user_id = auth.uid());

-- user_tenant: insert allowed for authenticated users (signup/invite)
create policy "Authenticated users can insert user_tenant"
  on public.user_tenant for insert
  with check (auth.uid() is not null);

-- invite: visible to tenant members
create policy "Invites visible to tenant members"
  on public.invite for select
  using (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

-- invite: insert by tenant admins/owners
create policy "Admins can create invites"
  on public.invite for insert
  with check (
    tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );
