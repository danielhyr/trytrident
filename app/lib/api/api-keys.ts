/**
 * API Key business logic.
 *
 * Follows the internal API pattern: (admin, tenantId, ...params) → result.
 * No cookies, no auth context, no Next.js coupling.
 *
 * Key format: trident_live_<32 random hex chars>
 * Only the SHA-256 hash is stored. Full key shown once at creation.
 */

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ApiKey {
  id: string;
  tenant_id: string;
  key_prefix: string;
  label: string;
  created_by: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface CreateApiKeyResult {
  key: string;     // Full key — shown once, never stored
  id: string;
  prefix: string;
}

function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export async function createApiKey(
  admin: SupabaseClient,
  tenantId: string,
  userId: string,
  label?: string
): Promise<CreateApiKeyResult> {
  const randomHex = crypto.randomBytes(16).toString("hex");
  const rawKey = `trident_live_${randomHex}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12); // "trident_live" = 12 chars

  const { data, error } = await admin
    .from("api_key")
    .insert({
      tenant_id: tenantId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      label: label ?? "Default",
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create API key: ${error.message}`);

  return { key: rawKey, id: data.id, prefix: keyPrefix };
}

export async function listApiKeys(
  admin: SupabaseClient,
  tenantId: string
): Promise<ApiKey[]> {
  const { data, error } = await admin
    .from("api_key")
    .select(
      "id, tenant_id, key_prefix, label, created_by, created_at, last_used_at, revoked_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list API keys: ${error.message}`);
  return data as ApiKey[];
}

export async function revokeApiKey(
  admin: SupabaseClient,
  tenantId: string,
  keyId: string
): Promise<void> {
  const { error } = await admin
    .from("api_key")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(`Failed to revoke API key: ${error.message}`);
}

/**
 * Validate a raw API key.
 * Returns { tenantId, keyId } on success, null if invalid or revoked.
 * Updates last_used_at fire-and-forget.
 */
export async function validateApiKey(
  admin: SupabaseClient,
  rawKey: string
): Promise<{ tenantId: string; keyId: string } | null> {
  const keyHash = hashKey(rawKey);

  const { data, error } = await admin
    .from("api_key")
    .select("id, tenant_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !data || data.revoked_at !== null) return null;

  // Fire-and-forget last_used_at update
  void admin
    .from("api_key")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { tenantId: data.tenant_id, keyId: data.id };
}
