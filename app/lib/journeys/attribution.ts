/**
 * Revenue Attribution — 7-day click attribution model.
 *
 * When an order is placed, find messages clicked by that contact
 * in the last 7 days and attribute revenue to the most recent click.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export async function attributeRevenue(
  admin: SupabaseClient,
  tenantId: string,
  contactId: string,
  orderRevenue: number
): Promise<void> {
  if (orderRevenue <= 0) return;

  // Find messages clicked by this contact in the last 7 days
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: clickedMessages } = await admin
    .from("message")
    .select("id, journey_enrollment_id, clicked_at")
    .eq("tenant_id", tenantId)
    .eq("contact_id", contactId)
    .not("clicked_at", "is", null)
    .gte("clicked_at", sevenDaysAgo)
    .order("clicked_at", { ascending: false })
    .limit(1);

  if (!clickedMessages || clickedMessages.length === 0) return;

  const message = clickedMessages[0];

  // Read current revenue then increment
  const { data: currentMessage } = await admin
    .from("message")
    .select("revenue_attributed")
    .eq("id", message.id)
    .single();

  const currentRevenue = parseFloat(
    String(currentMessage?.revenue_attributed ?? 0)
  );

  await admin
    .from("message")
    .update({
      revenue_attributed: (currentRevenue + orderRevenue).toFixed(2),
    })
    .eq("id", message.id);

  // Update decision_log outcome fields
  if (message.journey_enrollment_id) {
    await admin
      .from("decision_log")
      .update({
        outcome_converted: true,
        outcome_revenue: orderRevenue,
      })
      .eq("enrollment_id", message.journey_enrollment_id)
      .eq("action_type", "send")
      .eq("message_id", message.id);
  }
}
