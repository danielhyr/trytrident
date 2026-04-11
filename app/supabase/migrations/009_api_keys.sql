-- 009: API Keys for generic webhook/API ingestion
-- Supports multiple keys per tenant, independent revocation, SHA-256 hash storage.

CREATE TABLE IF NOT EXISTS public.api_key (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  key_hash     text NOT NULL,          -- SHA-256 of the full key (only thing stored)
  key_prefix   text NOT NULL,          -- first 8 chars for display (e.g. "trident_")
  label        text NOT NULL DEFAULT 'Default',
  created_by   uuid NOT NULL REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at   timestamptz            -- null = active
);

-- Only one active key per hash (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS api_key_hash_active_idx
  ON public.api_key (key_hash)
  WHERE revoked_at IS NULL;

-- Fast lookup by tenant
CREATE INDEX IF NOT EXISTS api_key_tenant_idx
  ON public.api_key (tenant_id);

-- RLS: tenant members can view and manage their own keys
ALTER TABLE public.api_key ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their api keys"
  ON public.api_key FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenant ut
      WHERE ut.tenant_id = api_key.tenant_id
        AND ut.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can insert api keys"
  ON public.api_key FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_tenant ut
      WHERE ut.tenant_id = api_key.tenant_id
        AND ut.user_id = auth.uid()
        AND ut.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Tenant admins can update api keys"
  ON public.api_key FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenant ut
      WHERE ut.tenant_id = api_key.tenant_id
        AND ut.user_id = auth.uid()
        AND ut.role IN ('owner', 'admin')
    )
  );
