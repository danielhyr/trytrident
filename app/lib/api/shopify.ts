/**
 * Shopify integration API — business logic functions.
 *
 * Called by BOTH server actions (UI) and chat tools (agent).
 * No cookie/auth dependency.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ShopifyStatus {
  connected: boolean;
  storeUrl: string | null;
}

export async function getShopifyStatus(
  admin: SupabaseClient,
  tenantId: string
): Promise<ShopifyStatus> {
  const { data } = await admin
    .from("tenant")
    .select("shopify_store_url")
    .eq("id", tenantId)
    .single();

  return {
    connected: !!data?.shopify_store_url,
    storeUrl: data?.shopify_store_url ?? null,
  };
}

export async function disconnectShopifyStore(
  admin: SupabaseClient,
  tenantId: string
): Promise<void> {
  const { error } = await admin
    .from("tenant")
    .update({
      shopify_store_url: null,
      shopify_access_token: null,
      shopify_webhook_secret: null,
    })
    .eq("id", tenantId);

  if (error) {
    throw new Error(`Failed to disconnect Shopify: ${error.message}`);
  }
}
