/**
 * Decision Logger — records every journey decision with contact snapshot.
 *
 * Called on every path through the engine: enrollment, send, suppression,
 * split assignment, exit. This is the training data for the contextual bandit.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DecisionLogEntry } from "./types";

interface LogDecisionParams {
  contactId: string;
  eventId?: string;
  actionType: string;
  journeyId?: string;
  enrollmentId?: string;
  messageId?: string;
  channel?: string;
  decisionMethod?: string;
  decisionReason?: string;
}

export async function logDecision(
  admin: SupabaseClient,
  tenantId: string,
  params: LogDecisionParams
): Promise<DecisionLogEntry> {
  // Fetch current contact snapshot for context
  let contactSnapshot: Record<string, unknown> | null = null;
  const { data: contact } = await admin
    .from("contact")
    .select(
      "engagement_score, lifecycle_stage, total_orders, total_revenue, avg_order_value, last_order_at, email_consent, sms_consent"
    )
    .eq("id", params.contactId)
    .single();

  if (contact) {
    contactSnapshot = contact as Record<string, unknown>;
  }

  const { data, error } = await admin
    .from("decision_log")
    .insert({
      tenant_id: tenantId,
      contact_id: params.contactId,
      event_id: params.eventId ?? null,
      contact_snapshot: contactSnapshot,
      action_type: params.actionType,
      journey_id: params.journeyId ?? null,
      enrollment_id: params.enrollmentId ?? null,
      message_id: params.messageId ?? null,
      channel: params.channel ?? null,
      decision_method: params.decisionMethod ?? "rule_engine",
      decision_reason: params.decisionReason ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to log decision:", error.message);
    // Don't throw — decision logging should never block the engine
    return {} as DecisionLogEntry;
  }

  return data as DecisionLogEntry;
}
