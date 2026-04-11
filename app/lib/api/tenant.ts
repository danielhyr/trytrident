/**
 * Tenant API — business logic functions.
 *
 * Called by BOTH server actions (UI) and chat tools (agent).
 * No cookie/auth dependency — auth is resolved by the caller.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTenantName(
  admin: SupabaseClient,
  tenantId: string
): Promise<string> {
  const { data, error } = await admin
    .from("tenant")
    .select("name")
    .eq("id", tenantId)
    .single();

  if (error || !data) throw new Error("Tenant not found");
  return data.name;
}

export async function updateTenantName(
  admin: SupabaseClient,
  tenantId: string,
  name: string
): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name cannot be empty");
  if (trimmed.length > 100) throw new Error("Name must be under 100 characters");

  const { data, error } = await admin
    .from("tenant")
    .update({ name: trimmed })
    .eq("id", tenantId)
    .select("name")
    .single();

  if (error) throw new Error("Failed to update workspace name");
  return data.name;
}
