import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawEventRow, ProcessingStats, DataSource } from "./types";
import { getNormalizer } from "./normalizers/registry";
import { resolveContact } from "./identity";
import { evaluateTriggersForEvent } from "@/lib/journeys/engine";
import { attributeRevenue } from "@/lib/journeys/attribution";

/**
 * Process unprocessed raw events in batches.
 * For each event: normalize -> resolve identity -> apply contact updates ->
 * apply order deltas -> insert canonical event -> mark processed.
 *
 * Per-event try/catch — one failure writes processing_error and continues.
 */
export async function processRawEvents(
  admin: SupabaseClient,
  batchSize = 50
): Promise<ProcessingStats> {
  const stats: ProcessingStats = {
    processed: 0,
    errors: 0,
    contacts_created: 0,
    contacts_updated: 0,
    events_created: 0,
  };

  // Fetch unprocessed events ordered by received_at
  const { data: rawEvents, error: fetchError } = await admin
    .from("raw_event")
    .select("*")
    .eq("processed", false)
    .is("processing_error", null)
    .order("received_at", { ascending: true })
    .limit(batchSize);

  if (fetchError) {
    throw new Error(`Failed to fetch raw events: ${fetchError.message}`);
  }

  if (!rawEvents || rawEvents.length === 0) {
    return stats;
  }

  for (const raw of rawEvents as RawEventRow[]) {
    try {
      await processOneEvent(admin, raw, stats);
    } catch (err) {
      stats.errors++;
      const message = err instanceof Error ? err.message : String(err);
      await admin
        .from("raw_event")
        .update({ processing_error: message })
        .eq("id", raw.id);
    }
  }

  return stats;
}

async function processOneEvent(
  admin: SupabaseClient,
  raw: RawEventRow,
  stats: ProcessingStats
): Promise<void> {
  // 1. Get the normalizer for this source
  const normalizer = getNormalizer(raw.source as DataSource);
  if (!normalizer) {
    throw new Error(`No normalizer for source: ${raw.source}`);
  }

  // 2. Normalize
  const result = normalizer.normalize(raw.event_type, raw.payload);

  // 3. Identity resolution (skip if no identifiers at all)
  const hasIdentifiers =
    result.identifiers.external_id ||
    result.identifiers.email ||
    result.identifiers.phone;

  let contactId: string | null = null;

  let contactCreated = false;
  let contactUpdated = false;

  if (hasIdentifiers) {
    const resolved = await resolveContact(
      admin,
      raw.tenant_id,
      result.identifiers,
      result.contactUpdate
    );
    contactId = resolved.contact.id;
    contactCreated = resolved.created;
    contactUpdated = resolved.updated;

    if (contactCreated) {
      stats.contacts_created++;
    } else if (contactUpdated) {
      stats.contacts_updated++;
    }

    // 4. Apply order delta if present
    if (result.orderDelta) {
      await applyOrderDelta(admin, contactId, result.orderDelta);
    }
  }

  // 5. Determine the real canonical event type.
  //    For customer events, the event type is based on what happened in
  //    OUR contact table, not what Shopify told us. A customers/create
  //    webhook for an existing contact is an update (or a no-op).
  let canonicalEventType = result.canonicalEvent.event_type;

  if (
    canonicalEventType === "customer.created" ||
    canonicalEventType === "customer.updated"
  ) {
    if (contactCreated) {
      canonicalEventType = "customer.created";
    } else if (contactUpdated) {
      canonicalEventType = "customer.updated";
    } else {
      // Existing contact, no fields changed — skip the event entirely
      await admin
        .from("raw_event")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("id", raw.id);
      stats.processed++;
      return;
    }
  }

  // Insert canonical event
  const { error: eventError } = await admin.from("event").insert({
    tenant_id: raw.tenant_id,
    contact_id: contactId,
    event_type: canonicalEventType,
    event_data: result.canonicalEvent.event_data,
    source: result.canonicalEvent.source,
    raw_event_id: raw.id,
  });

  if (eventError) {
    throw new Error(`Failed to insert event: ${eventError.message}`);
  }
  stats.events_created++;

  // 5b. Evaluate journey triggers for this event
  if (contactId) {
    try {
      await evaluateTriggersForEvent(
        admin,
        raw.tenant_id,
        contactId,
        canonicalEventType,
        raw.id
      );
    } catch (err) {
      // Journey trigger evaluation should not block event processing
      console.error("Journey trigger evaluation failed:", err);
    }

    // 5c. Revenue attribution for order.placed events
    if (
      result.canonicalEvent.event_type === "order.placed" &&
      result.orderDelta &&
      result.orderDelta.revenue_delta > 0
    ) {
      try {
        await attributeRevenue(
          admin,
          raw.tenant_id,
          contactId,
          result.orderDelta.revenue_delta
        );
      } catch (err) {
        console.error("Revenue attribution failed:", err);
      }
    }
  }

  // 6. Mark raw event as processed
  await admin
    .from("raw_event")
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq("id", raw.id);

  stats.processed++;
}

/**
 * Read current contact order totals, apply delta, recompute avg_order_value,
 * conditionally set first_order_at / last_order_at.
 */
async function applyOrderDelta(
  admin: SupabaseClient,
  contactId: string,
  delta: { orders_delta: number; revenue_delta: number }
): Promise<void> {
  // Read current values
  const { data: contact } = await admin
    .from("contact")
    .select("total_orders, total_revenue, first_order_at")
    .eq("id", contactId)
    .single();

  if (!contact) return;

  const newOrders = Math.max(0, contact.total_orders + delta.orders_delta);
  const newRevenue = Math.max(
    0,
    parseFloat(contact.total_revenue) + delta.revenue_delta
  );
  const newAvg = newOrders > 0 ? newRevenue / newOrders : 0;

  const updates: Record<string, unknown> = {
    total_orders: newOrders,
    total_revenue: newRevenue.toFixed(2),
    avg_order_value: newAvg.toFixed(2),
  };

  // Set last_order_at for new orders
  if (delta.orders_delta > 0) {
    updates.last_order_at = new Date().toISOString();
    if (!contact.first_order_at) {
      updates.first_order_at = new Date().toISOString();
    }
  }

  await admin.from("contact").update(updates).eq("id", contactId);
}
