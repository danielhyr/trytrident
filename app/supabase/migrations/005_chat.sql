-- ============================================================
-- Phase 3: Chat Conversations & Messages
-- Tables: chat_conversation, chat_message
-- Depends on: 001_auth_foundation (tenant, user_tenant)
-- ============================================================

create table public.chat_conversation (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenant(id) on delete cascade,
  user_id        uuid not null,
  title          text not null default 'New Chat',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.chat_conversation enable row level security;

-- Sidebar query: recent conversations for a user
create index chat_conversation_user_recent_idx
  on public.chat_conversation (tenant_id, user_id, updated_at desc);

-- ============================================================
-- RLS Policies — users see/manage own conversations
-- ============================================================

create policy "Users can view own conversations"
  on public.chat_conversation for select
  using (
    user_id = auth.uid()
    and tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

create policy "Users can create own conversations"
  on public.chat_conversation for insert
  with check (
    user_id = auth.uid()
    and tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

create policy "Users can update own conversations"
  on public.chat_conversation for update
  using (
    user_id = auth.uid()
    and tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

create policy "Users can delete own conversations"
  on public.chat_conversation for delete
  using (
    user_id = auth.uid()
    and tenant_id in (
      select tenant_id from public.user_tenant
      where user_id = auth.uid()
    )
  );

-- Updated_at trigger (reuses function from 003_data_ingestion)
create trigger chat_conversation_updated_at
  before update on public.chat_conversation
  for each row execute function public.set_updated_at();

-- ============================================================
-- Chat Messages
-- ============================================================

create table public.chat_message (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.chat_conversation(id) on delete cascade,
  role              text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content           text not null default '',
  tool_invocations  jsonb,
  created_at        timestamptz not null default now()
);

alter table public.chat_message enable row level security;

-- Message retrieval: all messages for a conversation in order
create index chat_message_conversation_idx
  on public.chat_message (conversation_id, created_at asc);

-- ============================================================
-- RLS Policies — users can read/write messages for own conversations
-- ============================================================

create policy "Users can view messages in own conversations"
  on public.chat_message for select
  using (
    conversation_id in (
      select id from public.chat_conversation
      where user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own conversations"
  on public.chat_message for insert
  with check (
    conversation_id in (
      select id from public.chat_conversation
      where user_id = auth.uid()
    )
  );
