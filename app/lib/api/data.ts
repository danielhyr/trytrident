/**
 * Data pipeline API — business logic functions.
 *
 * These take (admin, tenantId) and return structured results.
 * Called by BOTH server actions (UI) and chat tools (agent).
 * No cookie/auth dependency — auth is resolved by the caller.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { processRawEvents } from "@/lib/ingestion/processor";
import { importHistoricalData } from "@/lib/shopify/historical-import";
import type { ProcessingStats } from "@/lib/ingestion/types";
import type { ImportProgress } from "@/lib/shopify/historical-import";

export async function runEventProcessing(
  admin: SupabaseClient,
  batchSize?: number
): Promise<ProcessingStats> {
  return processRawEvents(admin, batchSize);
}

export async function runHistoricalImport(
  admin: SupabaseClient,
  tenantId: string
): Promise<ImportProgress> {
  const { data: tenant } = await admin
    .from("tenant")
    .select("shopify_store_url, shopify_access_token")
    .eq("id", tenantId)
    .single();

  if (!tenant?.shopify_store_url || !tenant?.shopify_access_token) {
    throw new Error("Shopify is not connected");
  }

  return importHistoricalData(
    admin,
    tenantId,
    tenant.shopify_store_url,
    tenant.shopify_access_token
  );
}

export interface PipelineStats {
  rawTotal: number;
  rawUnprocessed: number;
  rawErrors: number;
  contacts: number;
  events: number;
}

export async function getPipelineStats(
  admin: SupabaseClient,
  tenantId: string
): Promise<PipelineStats> {
  const [rawTotal, rawUnprocessed, rawErrors, contactCount, eventCount] =
    await Promise.all([
      admin
        .from("raw_event")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      admin
        .from("raw_event")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("processed", false)
        .is("processing_error", null),
      admin
        .from("raw_event")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .not("processing_error", "is", null),
      admin
        .from("contact")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      admin
        .from("event")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
    ]);

  return {
    rawTotal: rawTotal.count ?? 0,
    rawUnprocessed: rawUnprocessed.count ?? 0,
    rawErrors: rawErrors.count ?? 0,
    contacts: contactCount.count ?? 0,
    events: eventCount.count ?? 0,
  };
}
