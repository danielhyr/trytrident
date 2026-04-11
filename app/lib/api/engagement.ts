/**
 * Engagement scoring — recalculates engagement_score and lifecycle_stage.
 *
 * Signal weights from spec:
 *   email.opened +5 (30d half-life)
 *   email.clicked +15 (30d half-life)
 *   order.placed +30 (60d half-life)
 *   cart.abandoned -5 (resets on next order)
 *   email.unsubscribed → 0
 *   email.complained → -100
 *
 * Lifecycle stage from score:
 *   vip (80+), active (40-79), at_risk (15-39),
 *   lapsed (<15 with orders), prospect (<15 no orders)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface SignalConfig {
  event_type: string;
  base_weight: number;
  half_life_days: number;
}

const SIGNALS: SignalConfig[] = [
  { event_type: "email.opened", base_weight: 5, half_life_days: 30 },
  { event_type: "email.clicked", base_weight: 15, half_life_days: 30 },
  { event_type: "order.placed", base_weight: 30, half_life_days: 60 },
];

const SUPPRESS_EVENTS = ["email.unsubscribed", "email.complained"];
const CART_ABANDON_PENALTY = -5;

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function decayedWeight(baseWeight: number, daysSince: number, halfLifeDays: number): number {
  return baseWeight * Math.pow(0.5, daysSince / halfLifeDays);
}

function deriveLifecycleStage(
  score: number,
  hasOrders: boolean
): string {
  if (score >= 80) return "vip";
  if (score >= 40) return "active";
  if (score >= 15) return "at_risk";
  if (hasOrders) return "lapsed";
  return "prospect";
}

export async function recalculateEngagement(
  admin: SupabaseClient,
  tenantId: string
): Promise<{ updated: number }> {
  const now = new Date();
  const lookbackDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Fetch all contacts for tenant
  const { data: contacts, error: contactError } = await admin
    .from("contact")
    .select("id, total_orders")
    .eq("tenant_id", tenantId);

  if (contactError) throw new Error(`Failed to fetch contacts: ${contactError.message}`);
  if (!contacts || contacts.length === 0) return { updated: 0 };

  // Fetch all relevant events in the lookback window
  const relevantTypes = [
    ...SIGNALS.map((s) => s.event_type),
    ...SUPPRESS_EVENTS,
    "cart.abandoned",
  ];

  const { data: events, error: eventError } = await admin
    .from("event")
    .select("contact_id, event_type, created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", lookbackDate.toISOString())
    .in("event_type", relevantTypes);

  if (eventError) throw new Error(`Failed to fetch events: ${eventError.message}`);

  // Group events by contact
  const eventsByContact = new Map<string, Array<{ event_type: string; created_at: string }>>();
  for (const evt of events ?? []) {
    if (!evt.contact_id) continue;
    const list = eventsByContact.get(evt.contact_id) ?? [];
    list.push(evt);
    eventsByContact.set(evt.contact_id, list);
  }

  // Calculate scores
  let updated = 0;

  for (const contact of contacts) {
    const contactEvents = eventsByContact.get(contact.id) ?? [];

    // Check for suppression events
    const suppressed = contactEvents.some((e) => SUPPRESS_EVENTS.includes(e.event_type));
    if (suppressed) {
      await admin
        .from("contact")
        .update({ engagement_score: 0, lifecycle_stage: "lapsed" })
        .eq("id", contact.id);
      updated++;
      continue;
    }

    let score = 0;

    // Check if there's an order after last cart abandon (resets penalty)
    const lastOrder = contactEvents
      .filter((e) => e.event_type === "order.placed")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    const cartAbandons = contactEvents.filter(
      (e) => e.event_type === "cart.abandoned"
    );

    // Apply positive signals with decay
    for (const signal of SIGNALS) {
      const matching = contactEvents.filter(
        (e) => e.event_type === signal.event_type
      );
      for (const evt of matching) {
        const days = daysBetween(now, new Date(evt.created_at));
        score += decayedWeight(signal.base_weight, days, signal.half_life_days);
      }
    }

    // Apply cart abandon penalties (only those after last order)
    for (const abandon of cartAbandons) {
      if (!lastOrder || abandon.created_at > lastOrder.created_at) {
        score += CART_ABANDON_PENALTY;
      }
    }

    // Clamp to 0-100
    const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
    const hasOrders = contact.total_orders > 0;
    const stage = deriveLifecycleStage(clampedScore, hasOrders);

    await admin
      .from("contact")
      .update({
        engagement_score: clampedScore,
        lifecycle_stage: stage,
      })
      .eq("id", contact.id);

    updated++;
  }

  return { updated };
}
