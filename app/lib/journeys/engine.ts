/**
 * Journey Engine — the state machine core.
 *
 * Called from two places:
 * 1. Event processor (after canonical event insert) — evaluateTriggersForEvent
 * 2. Cron (for waiting enrollments) — processWaitingEnrollments
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Journey,
  JourneyEnrollment,
  JourneyNode,
  JourneyGraph,
  TriggerConfig,
  ActionNodeData,
  WaitNodeData,
  ConditionNodeData,
  SplitNodeData,
  ExitNodeData,
} from "./types";
import { getNextNodes } from "@/lib/api/journeys";
import { checkCompliance } from "./compliance";
import { logDecision } from "./decision-logger";

// ============================================================
// Trigger evaluation — called after each canonical event insert
// ============================================================

export async function evaluateTriggersForEvent(
  admin: SupabaseClient,
  tenantId: string,
  contactId: string,
  eventType: string,
  eventId?: string
): Promise<void> {
  // Find active journeys whose trigger_config matches this event type
  const { data: journeys } = await admin
    .from("journey")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (!journeys || journeys.length === 0) return;

  for (const journeyRow of journeys) {
    const journey = journeyRow as Journey;
    const triggerConfig = journey.trigger_config;

    // Skip segment-triggered journeys — they're enrolled via batch, not events
    const triggerType = triggerConfig?.trigger_type ?? "event";
    if (triggerType === "segment") continue;

    // Check if this journey triggers on this event type
    if (!triggerConfig?.event_type || triggerConfig.event_type !== eventType) {
      continue;
    }

    // Check entry limit
    if (journey.entry_limit) {
      const { count } = await admin
        .from("journey_enrollment")
        .select("*", { count: "exact", head: true })
        .eq("journey_id", journey.id);
      if ((count ?? 0) >= journey.entry_limit) continue;
    }

    // Check re-entry policy — the unique index handles dedup for active/waiting
    if (!journey.re_entry_allowed) {
      const { count: existingCount } = await admin
        .from("journey_enrollment")
        .select("*", { count: "exact", head: true })
        .eq("contact_id", contactId)
        .eq("journey_id", journey.id);
      if ((existingCount ?? 0) > 0) continue;
    }

    // Find the trigger node to get the starting position
    const graph = journey.graph as JourneyGraph;
    const triggerNode = graph.nodes.find((n) => n.type === "trigger");
    if (!triggerNode) continue;

    // Enroll contact
    try {
      const { data: enrollment, error } = await admin
        .from("journey_enrollment")
        .insert({
          tenant_id: tenantId,
          contact_id: contactId,
          journey_id: journey.id,
          current_node_id: triggerNode.id,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        // Unique constraint violation = already enrolled (active/waiting)
        if (error.code === "23505") continue;
        console.error(`Failed to enroll contact: ${error.message}`);
        continue;
      }

      await logDecision(admin, tenantId, {
        contactId,
        eventId,
        actionType: "journey_enroll",
        journeyId: journey.id,
        enrollmentId: enrollment.id,
        decisionReason: `Triggered by ${eventType}`,
      });

      // Advance past trigger to first real node
      await advanceEnrollment(
        admin,
        tenantId,
        enrollment.id,
        journey,
        eventId
      );
    } catch (err) {
      console.error(
        `Error enrolling contact ${contactId} in journey ${journey.id}:`,
        err
      );
    }
  }
}

// ============================================================
// Segment enrollment — batch-enroll contacts from a segment
// ============================================================

export async function enrollSegmentContacts(
  admin: SupabaseClient,
  tenantId: string,
  journey: Journey,
  batchSize = 100
): Promise<{ enrolled: number; skipped: number; errors: number }> {
  const stats = { enrolled: 0, skipped: 0, errors: 0 };
  const tc = journey.trigger_config as TriggerConfig;

  if (!tc?.segment_id) {
    console.error(`Journey ${journey.id} has no segment_id in trigger_config`);
    return stats;
  }

  // Fetch segment to get its rules
  const { data: segment, error: segErr } = await admin
    .from("segment")
    .select("*")
    .eq("id", tc.segment_id)
    .eq("tenant_id", tenantId)
    .single();

  if (segErr || !segment) {
    console.error(`Segment ${tc.segment_id} not found: ${segErr?.message}`);
    await updateTriggerConfig(admin, journey.id, { enrollment_status: "failed" });
    return stats;
  }

  const graph = journey.graph as JourneyGraph;
  const triggerNode = graph.nodes.find((n) => n.type === "trigger");
  if (!triggerNode) {
    await updateTriggerConfig(admin, journey.id, { enrollment_status: "failed" });
    return stats;
  }

  // Paginate through all matching contacts
  const { evaluateRules } = await import("@/lib/segments/evaluator");
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { contacts } = await evaluateRules(admin, tenantId, segment.rules, {
      limit: batchSize,
      offset,
    });

    if (contacts.length === 0) {
      hasMore = false;
      break;
    }

    for (const contact of contacts) {
      try {
        // Check entry limit
        if (journey.entry_limit) {
          const { count } = await admin
            .from("journey_enrollment")
            .select("*", { count: "exact", head: true })
            .eq("journey_id", journey.id);
          if ((count ?? 0) >= journey.entry_limit) {
            stats.skipped++;
            continue;
          }
        }

        // Check re-entry policy
        if (!journey.re_entry_allowed) {
          const { count: existingCount } = await admin
            .from("journey_enrollment")
            .select("*", { count: "exact", head: true })
            .eq("contact_id", contact.id)
            .eq("journey_id", journey.id);
          if ((existingCount ?? 0) > 0) {
            stats.skipped++;
            continue;
          }
        }

        // Enroll
        const { data: enrollment, error } = await admin
          .from("journey_enrollment")
          .insert({
            tenant_id: tenantId,
            contact_id: contact.id,
            journey_id: journey.id,
            current_node_id: triggerNode.id,
            status: "active",
          })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            stats.skipped++;
            continue;
          }
          stats.errors++;
          continue;
        }

        await logDecision(admin, tenantId, {
          contactId: contact.id,
          actionType: "journey_enroll",
          journeyId: journey.id,
          enrollmentId: enrollment.id,
          decisionReason: `Segment enrollment: ${tc.segment_name ?? tc.segment_id}`,
        });

        await advanceEnrollment(admin, tenantId, enrollment.id, journey);
        stats.enrolled++;
      } catch (err) {
        stats.errors++;
        console.error(`Error enrolling contact ${contact.id} from segment:`, err);
      }
    }

    offset += batchSize;
    if (contacts.length < batchSize) hasMore = false;
  }

  // Update enrollment status
  const finalStatus = stats.errors > 0 && stats.enrolled === 0 ? "failed" : "completed";
  await updateTriggerConfig(admin, journey.id, { enrollment_status: finalStatus });

  return stats;
}

async function updateTriggerConfig(
  admin: SupabaseClient,
  journeyId: string,
  updates: Partial<TriggerConfig>
): Promise<void> {
  const { data: journey } = await admin
    .from("journey")
    .select("trigger_config")
    .eq("id", journeyId)
    .single();

  if (!journey) return;

  const existing = (journey.trigger_config ?? {}) as TriggerConfig;
  await admin
    .from("journey")
    .update({ trigger_config: { ...existing, ...updates } })
    .eq("id", journeyId);
}

// ============================================================
// State machine core — advance an enrollment through nodes
// ============================================================

export async function advanceEnrollment(
  admin: SupabaseClient,
  tenantId: string,
  enrollmentId: string,
  journey?: Journey,
  eventId?: string
): Promise<void> {
  // Fetch enrollment
  const { data: enrollmentRow } = await admin
    .from("journey_enrollment")
    .select("*")
    .eq("id", enrollmentId)
    .single();

  if (!enrollmentRow) return;
  const enrollment = enrollmentRow as JourneyEnrollment;

  if (enrollment.status !== "active" && enrollment.status !== "waiting") {
    return;
  }

  // Fetch journey if not provided
  if (!journey) {
    const { data: journeyRow } = await admin
      .from("journey")
      .select("*")
      .eq("id", enrollment.journey_id)
      .single();
    if (!journeyRow) return;
    journey = journeyRow as Journey;
  }

  // Don't process if journey isn't active
  if (journey.status !== "active") return;

  const graph = journey.graph as JourneyGraph;
  let currentNodeId = enrollment.current_node_id;
  if (!currentNodeId) return;

  // Process nodes iteratively until hitting Wait or Exit
  let iterations = 0;
  const maxIterations = 50; // safety limit

  while (iterations < maxIterations) {
    iterations++;

    const currentNode = graph.nodes.find((n) => n.id === currentNodeId);
    if (!currentNode) {
      // Node not found — complete the enrollment
      await completeEnrollment(admin, enrollmentId, "node_not_found");
      return;
    }

    // Get next nodes based on current node type
    const nextNodeIds = await processNode(
      admin,
      tenantId,
      enrollment,
      journey,
      currentNode,
      graph,
      eventId
    );

    if (nextNodeIds === null) {
      // Node processing says to stop (wait or exit)
      return;
    }

    if (nextNodeIds.length === 0) {
      // No next node — journey complete
      await completeEnrollment(admin, enrollmentId, "journey_complete");
      return;
    }

    // Move to next node
    currentNodeId = nextNodeIds[0];
    await admin
      .from("journey_enrollment")
      .update({ current_node_id: currentNodeId })
      .eq("id", enrollmentId);
  }

  console.error(
    `Enrollment ${enrollmentId} hit max iterations — possible loop`
  );
}

/**
 * Process a single node and return next node IDs.
 * Returns null if processing should stop (wait or exit).
 * Returns empty array if journey is complete.
 */
async function processNode(
  admin: SupabaseClient,
  tenantId: string,
  enrollment: JourneyEnrollment,
  journey: Journey,
  node: JourneyNode,
  graph: JourneyGraph,
  eventId?: string
): Promise<string[] | null> {
  switch (node.type) {
    case "trigger": {
      // Trigger already handled — just advance to next
      return getNextNodes(graph, node.id);
    }

    case "action": {
      const data = node.data as ActionNodeData;

      if (data.action_type?.startsWith("send_")) {
        const channel = data.action_type.replace("send_", "") as
          | "email"
          | "sms"
          | "push";

        // Run compliance check
        const compliance = await checkCompliance(
          admin,
          tenantId,
          enrollment.contact_id,
          channel,
          data.content_template_id
        );

        if (compliance.status === "block") {
          // Log suppression and skip to next node
          await logDecision(admin, tenantId, {
            contactId: enrollment.contact_id,
            eventId,
            actionType: "suppress",
            journeyId: journey.id,
            enrollmentId: enrollment.id,
            channel,
            decisionReason: compliance.violations
              .map((v) => v.message)
              .join("; "),
          });

          // Skip this node, continue to next
          return getNextNodes(graph, node.id);
        }

        // Queue message (actual sending handled by SendGrid integration)
        const { data: message, error: msgError } = await admin
          .from("message")
          .insert({
            tenant_id: tenantId,
            contact_id: enrollment.contact_id,
            journey_enrollment_id: enrollment.id,
            content_template_id: data.content_template_id ?? null,
            channel,
            status: "queued",
          })
          .select()
          .single();

        if (msgError) {
          console.error(`Failed to queue message: ${msgError.message}`);
          return getNextNodes(graph, node.id);
        }

        await logDecision(admin, tenantId, {
          contactId: enrollment.contact_id,
          eventId,
          actionType: "send",
          journeyId: journey.id,
          enrollmentId: enrollment.id,
          messageId: message.id,
          channel,
          decisionReason: `Send ${channel} via template ${data.content_template_id ?? "inline"}`,
        });

        return getNextNodes(graph, node.id);
      }

      if (data.action_type === "update_attribute") {
        // Update contact attribute
        if (data.attribute_key) {
          await admin
            .from("contact")
            .update({ [data.attribute_key]: data.attribute_value })
            .eq("id", enrollment.contact_id);
        }
        return getNextNodes(graph, node.id);
      }

      return getNextNodes(graph, node.id);
    }

    case "wait": {
      const data = node.data as WaitNodeData;

      if (data.wait_type === "delay") {
        const delayMs = getDelayMs(data);
        const waitUntil = new Date(Date.now() + delayMs).toISOString();

        await admin
          .from("journey_enrollment")
          .update({
            status: "waiting",
            wait_until: waitUntil,
          })
          .eq("id", enrollment.id);

        return null; // Stop processing
      }

      if (data.wait_type === "wait_for_event") {
        // Set status to waiting without wait_until (event-triggered)
        const timeoutMs = (data.timeout_hours ?? 168) * 60 * 60 * 1000;
        await admin
          .from("journey_enrollment")
          .update({
            status: "waiting",
            wait_until: new Date(Date.now() + timeoutMs).toISOString(),
          })
          .eq("id", enrollment.id);

        return null; // Stop processing
      }

      return getNextNodes(graph, node.id);
    }

    case "condition": {
      const data = node.data as ConditionNodeData;

      // Fetch contact for condition evaluation
      const { data: contact } = await admin
        .from("contact")
        .select("*")
        .eq("id", enrollment.contact_id)
        .single();

      let conditionMet = false;
      if (contact) {
        const fieldValue = (contact as Record<string, unknown>)[data.field];
        conditionMet = evaluateCondition(
          fieldValue,
          data.operator,
          data.value
        );
      }

      await logDecision(admin, tenantId, {
        contactId: enrollment.contact_id,
        eventId,
        actionType: "condition_eval",
        journeyId: journey.id,
        enrollmentId: enrollment.id,
        decisionReason: `${data.field} ${data.operator} ${data.value} = ${conditionMet}`,
      });

      // Follow "yes" or "no" handle
      const handle = conditionMet ? "yes" : "no";
      return getNextNodes(graph, node.id, handle);
    }

    case "split": {
      const data = node.data as SplitNodeData;
      const percent = data.split_a_percent ?? 50;
      const isVariantA = Math.random() * 100 < percent;
      const variant = isVariantA ? "A" : "B";

      await logDecision(admin, tenantId, {
        contactId: enrollment.contact_id,
        eventId,
        actionType: "split_assign",
        journeyId: journey.id,
        enrollmentId: enrollment.id,
        decisionReason: `Assigned to variant ${variant} (${percent}% / ${100 - percent}%)`,
      });

      const handle = isVariantA ? "a" : "b";
      return getNextNodes(graph, node.id, handle);
    }

    case "exit": {
      const data = node.data as ExitNodeData;
      await completeEnrollment(
        admin,
        enrollment.id,
        data.exit_reason ?? "journey_complete"
      );

      await logDecision(admin, tenantId, {
        contactId: enrollment.contact_id,
        eventId,
        actionType: "exit",
        journeyId: journey.id,
        enrollmentId: enrollment.id,
        decisionReason: data.exit_reason ?? "journey_complete",
      });

      return null; // Stop processing
    }

    default:
      return getNextNodes(graph, node.id);
  }
}

// ============================================================
// Cron: process waiting enrollments
// ============================================================

export async function processWaitingEnrollments(
  admin: SupabaseClient,
  batchSize = 50
): Promise<{ processed: number; errors: number }> {
  const stats = { processed: 0, errors: 0 };

  const now = new Date().toISOString();

  // Check for scheduled segment journeys that are due
  const { data: scheduledJourneys } = await admin
    .from("journey")
    .select("*")
    .eq("status", "active")
    .not("trigger_config->scheduled_for", "is", null);

  for (const j of scheduledJourneys ?? []) {
    const journey = j as Journey;
    const tc = journey.trigger_config as TriggerConfig;
    if (tc?.enrollment_status === "completed") continue;
    if (tc?.enrollment_status === "failed") continue;
    if (!tc?.scheduled_for) continue;
    if (tc.scheduled_for > now) continue; // not yet due
    await enrollSegmentContacts(admin, journey.tenant_id, journey);
  }

  const { data: enrollments } = await admin
    .from("journey_enrollment")
    .select("*")
    .eq("status", "waiting")
    .lte("wait_until", now)
    .order("wait_until", { ascending: true })
    .limit(batchSize);

  if (!enrollments || enrollments.length === 0) return stats;

  for (const row of enrollments) {
    try {
      const enrollment = row as JourneyEnrollment;

      // Set back to active and advance to next node
      const currentNodeId = enrollment.current_node_id;
      if (!currentNodeId) {
        await completeEnrollment(admin, enrollment.id, "no_current_node");
        stats.processed++;
        continue;
      }

      // Fetch journey to get graph
      const { data: journey } = await admin
        .from("journey")
        .select("*")
        .eq("id", enrollment.journey_id)
        .single();

      if (!journey || (journey as Journey).status !== "active") {
        await completeEnrollment(admin, enrollment.id, "journey_inactive");
        stats.processed++;
        continue;
      }

      // Get next nodes from current (wait) node
      const graph = (journey as Journey).graph as JourneyGraph;
      const nextNodeIds = getNextNodes(graph, currentNodeId);

      if (nextNodeIds.length === 0) {
        await completeEnrollment(admin, enrollment.id, "journey_complete");
        stats.processed++;
        continue;
      }

      // Update enrollment to active, move to next node
      await admin
        .from("journey_enrollment")
        .update({
          status: "active",
          current_node_id: nextNodeIds[0],
          wait_until: null,
        })
        .eq("id", enrollment.id);

      // Continue advancing
      await advanceEnrollment(
        admin,
        enrollment.tenant_id,
        enrollment.id,
        journey as Journey
      );

      stats.processed++;
    } catch (err) {
      stats.errors++;
      console.error(`Error processing enrollment ${row.id}:`, err);
    }
  }

  return stats;
}

// ============================================================
// Helpers
// ============================================================

async function completeEnrollment(
  admin: SupabaseClient,
  enrollmentId: string,
  reason: string
): Promise<void> {
  await admin
    .from("journey_enrollment")
    .update({
      status: "completed",
      exit_reason: reason,
    })
    .eq("id", enrollmentId);
}

function getDelayMs(data: WaitNodeData): number {
  const amount = data.delay_amount ?? 1;
  switch (data.delay_unit) {
    case "minutes":
      return amount * 60 * 1000;
    case "hours":
      return amount * 60 * 60 * 1000;
    case "days":
      return amount * 24 * 60 * 60 * 1000;
    default:
      return amount * 60 * 60 * 1000; // default to hours
  }
}

function evaluateCondition(
  fieldValue: unknown,
  operator: string,
  compareValue: string | number | boolean
): boolean {
  if (fieldValue === null || fieldValue === undefined) {
    return operator === "is_null";
  }

  const fv = typeof fieldValue === "string" ? fieldValue.toLowerCase() : fieldValue;
  const cv =
    typeof compareValue === "string" ? compareValue.toLowerCase() : compareValue;

  switch (operator) {
    case "eq":
      return fv == cv;
    case "neq":
      return fv != cv;
    case "gt":
      return Number(fv) > Number(cv);
    case "gte":
      return Number(fv) >= Number(cv);
    case "lt":
      return Number(fv) < Number(cv);
    case "lte":
      return Number(fv) <= Number(cv);
    case "contains":
      return String(fv).includes(String(cv));
    case "is_null":
      return fv === null || fv === undefined;
    case "is_not_null":
      return fv !== null && fv !== undefined;
    default:
      return false;
  }
}
