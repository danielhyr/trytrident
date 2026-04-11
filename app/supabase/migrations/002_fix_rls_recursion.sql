-- Fix infinite recursion in user_tenant RLS policy.
-- The original policy queried user_tenant to check membership,
-- causing a self-referencing loop. Replace with direct auth.uid() check.

drop policy if exists "User-tenant visible to co-members" on public.user_tenant;

create policy "Users can see own memberships"
  on public.user_tenant for select
  using (user_id = auth.uid());
