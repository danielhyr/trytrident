/**
 * Shopify Historical Data Import
 *
 * Fetches all existing customers and orders from the Shopify REST Admin API
 * using cursor-based pagination (Link header), and inserts each record as a
 * raw_event row with source="shopify". This lets the existing normalizer
 * pipeline (ShopifyNormalizer → identity resolution → processor) handle
 * everything uniformly — same code path for webhooks and historical import.
 *
 * Idempotency: uses "historical-{resource}-{id}" as the idempotency_key,
 * so re-running the import skips already-imported records.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const API_VERSION = "2024-01";
const PAGE_SIZE = 250; // Shopify max per page

export interface ImportProgress {
  customers_fetched: number;
  orders_fetched: number;
  raw_events_inserted: number;
  errors: string[];
}

/**
 * Import all historical customers and orders from a Shopify store.
 * Returns progress stats.
 */
export async function importHistoricalData(
  admin: SupabaseClient,
  tenantId: string,
  shop: string,
  accessToken: string
): Promise<ImportProgress> {
  const progress: ImportProgress = {
    customers_fetched: 0,
    orders_fetched: 0,
    raw_events_inserted: 0,
    errors: [],
  };

  // Import customers first, then orders
  await importResource(
    admin,
    tenantId,
    shop,
    accessToken,
    "customers",
    "customers/create",
    progress
  );

  await importResource(
    admin,
    tenantId,
    shop,
    accessToken,
    "orders",
    "orders/create",
    progress
  );

  return progress;
}

/**
 * Paginate through a Shopify REST resource and insert each record as a raw_event.
 * Uses cursor-based pagination via the Link header (rel="next").
 */
async function importResource(
  admin: SupabaseClient,
  tenantId: string,
  shop: string,
  accessToken: string,
  resource: "customers" | "orders",
  eventType: string,
  progress: ImportProgress
): Promise<void> {
  let url = `https://${shop}/admin/api/${API_VERSION}/${resource}.json?limit=${PAGE_SIZE}`;

  // For orders, include all statuses (default only returns open orders)
  if (resource === "orders") {
    url += "&status=any";
  }

  let pageCount = 0;

  while (url) {
    pageCount++;
    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      progress.errors.push(
        `Failed to fetch ${resource} page ${pageCount}: ${err instanceof Error ? err.message : String(err)}`
      );
      break;
    }

    if (!response.ok) {
      // Handle rate limiting (429) with retry
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 : 2000;
        await sleep(waitMs);
        continue; // Retry the same URL
      }

      progress.errors.push(
        `${resource} page ${pageCount}: HTTP ${response.status}`
      );
      break;
    }

    const body = await response.json();
    const records = body[resource] as Array<Record<string, unknown>>;

    if (!records || records.length === 0) break;

    if (resource === "customers") {
      progress.customers_fetched += records.length;
    } else {
      progress.orders_fetched += records.length;
    }

    // Insert each record individually — the unique index is partial
    // (WHERE idempotency_key IS NOT NULL), so batch upsert can't use it.
    // Catch duplicate errors (23505) per row and skip them.
    for (const record of records) {
      const { error } = await admin.from("raw_event").insert({
        tenant_id: tenantId,
        source: "shopify" as const,
        event_type: eventType,
        idempotency_key: `historical-${resource}-${record.id}`,
        payload: record,
        processed: false,
      });

      if (error) {
        // 23505 = unique_violation (duplicate) — skip silently
        if (error.code === "23505") {
          continue;
        }
        progress.errors.push(
          `Insert ${resource} ${record.id}: ${error.message}`
        );
      } else {
        progress.raw_events_inserted++;
      }
    }

    // Follow cursor-based pagination via Link header
    url = getNextPageUrl(response.headers.get("link"));
  }
}

/**
 * Parse the Link header to find the "next" page URL.
 * Format: <https://shop.myshopify.com/admin/api/.../resource.json?page_info=xyz&limit=250>; rel="next"
 */
function getNextPageUrl(linkHeader: string | null): string {
  if (!linkHeader) return "";

  const parts = linkHeader.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }

  return "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
