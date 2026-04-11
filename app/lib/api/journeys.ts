/**
 * Journey API — business logic functions.
 *
 * Pure functions taking (admin, tenantId, ...) — no cookies, no Next.js coupling.
 * Called by server actions (UI) and chat tools (agent).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Journey,
  JourneyEnrollment,
  JourneyGraph,
  JourneyNode,
  JourneyStats,
  TriggerConfig,
  TriggerNodeData,
  CreateJourneyInput,
  UpdateJourneyInput,
  ListJourneysOptions,
} from "@/lib/journeys/types";

// ============================================================
// CRUD
// ============================================================

export async function createJourney(
  admin: SupabaseClient,
  tenantId: string,
  input: CreateJourneyInput
): Promise<Journey> {
  const { data, error } = await admin
    .from("journey")
    .insert({
      tenant_id: tenantId,
      name: input.name,
      description: input.description ?? null,
      graph: input.graph ?? { nodes: [], edges: [] },
      status: "draft",
      trigger_config: input.trigger_config ?? {},
      entry_limit: input.entry_limit ?? null,
      re_entry_allowed: input.re_entry_allowed ?? false,
      created_by: input.created_by ?? "user",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create journey: ${error.message}`);
  return data as Journey;
}

export async function getJourney(
  admin: SupabaseClient,
  tenantId: string,
  journeyId: string
): Promise<Journey> {
  const { data, error } = await admin
    .from("journey")
    .select("*")
    .eq("id", journeyId)
    .eq("tenant_id", tenantId)
    .single();

  if (error) throw new Error(`Journey not found: ${error.message}`);
  return data as Journey;
}

export async function listJourneys(
  admin: SupabaseClient,
  tenantId: string,
  options?: ListJourneysOptions
): Promise<{ journeys: Journey[]; total: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  // Count query
  let countQuery = admin
    .from("journey")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (options?.status) countQuery = countQuery.eq("status", options.status);
  if (options?.search) {
    countQuery = countQuery.or(
      `name.ilike.%${options.search}%,description.ilike.%${options.search}%`
    );
  }

  const { count } = await countQuery;

  // Data query
  let dataQuery = admin
    .from("journey")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.status) dataQuery = dataQuery.eq("status", options.status);
  if (options?.search) {
    dataQuery = dataQuery.or(
      `name.ilike.%${options.search}%,description.ilike.%${options.search}%`
    );
  }

  const { data, error } = await dataQuery;
  if (error) throw new Error(`Failed to list journeys: ${error.message}`);

  return {
    journeys: (data ?? []) as Journey[],
    total: count ?? 0,
  };
}

export async function updateJourney(
  admin: SupabaseClient,
  tenantId: string,
  journeyId: string,
  input: UpdateJourneyInput
): Promise<Journey> {
  // Only allow editing when draft or paused
  const existing = await getJourney(admin, tenantId, journeyId);
  if (existing.status !== "draft" && existing.status !== "paused") {
    throw new Error(
      `Cannot edit journey in '${existing.status}' status. Pause it first.`
    );
  }

  const updatePayload: Record<string, unknown> = {};
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.description !== undefined)
    updatePayload.description = input.description;
  if (input.graph !== undefined) updatePayload.graph = input.graph;
  if (input.trigger_config !== undefined)
    updatePayload.trigger_config = input.trigger_config;
  if (input.entry_limit !== undefined)
    updatePayload.entry_limit = input.entry_limit;
  if (input.re_entry_allowed !== undefined)
    updatePayload.re_entry_allowed = input.re_entry_allowed;

  const { data, error } = await admin
    .from("journey")
    .update(updatePayload)
    .eq("id", journeyId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update journey: ${error.message}`);
  return data as Journey;
}

export async function deleteJourney(
  admin: SupabaseClient,
  tenantId: string,
  journeyId: string
): Promise<void> {
  const existing = await getJourney(admin, tenantId, journeyId);
  if (existing.status !== "draft" && existing.status !== "archived") {
    throw new Error(
      `Cannot delete journey in '${existing.status}' status. Archive it first.`
    );
  }

  const { error } = await admin
    .from("journey")
    .delete()
    .eq("id", journeyId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(`Failed to delete journey: ${error.message}`);
}

export async function duplicateJourney(
  admin: SupabaseClient,
  tenantId: string,
  journeyId: string
): Promise<Journey> {
  const original = await getJourney(admin, tenantId, journeyId);

  return createJourney(admin, tenantId, {
    name: `${original.name} (Copy)`,
    description: original.description ?? undefined,
    graph: original.graph,
    trigger_config: original.trigger_config,
    entry_limit: original.entry_limit ?? undefined,
    re_entry_allowed: original.re_entry_allowed,
  });
}

// ============================================================
// Status transitions
// ============================================================

export async function activateJourney(
  admin: SupabaseClient,
  tenantId: string,
  journeyId: string,
  schedule?: { scheduled_for: string; timezone: string } | null
): Promise<Journey> {
  const journey = await getJourney(admin, tenantId, journeyId);
  if (journey.status !== "draft" && journey.status !== "paused") {
    throw new Error(`Cannot activate journey in '${journey.status}' status`);
  }

  // Validate graph before activation
  const validation = validateJourneyGraph(journey.graph);
  if (!validation.valid) {
    throw new Error(
      `Journey graph is invalid: ${validation.errors.join(", ")}`
    );
  }

  const tc = journey.trigger_config as TriggerConfig;
  const triggerType = tc?.trigger_type ?? "event";

  if (triggerType === "segment" && schedule) {
    // Scheduled segment send — cron picks it up
    const updatedConfig: TriggerConfig = {
      ...tc,
      scheduled_for: schedule.scheduled_for,
      scheduled_timezone: schedule.timezone,
      enrollment_status: "pending",
    };

    const { data, error } = await admin
      .from("journey")
      .update({ status: "active", trigger_config: updatedConfig })
      .eq("id", journeyId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw new Error(`Failed to activate journey: ${error.message}`);
    return data as Journey;
  }

  if (triggerType === "segment") {
    // Send now — activate and enroll immediately
    const updatedConfig: TriggerConfig = {
      ...tc,
      enrollment_status: "pending",
    };

    const { data, error } = await admin
      .from("journey")
      .update({ status: "active", trigger_config: updatedConfig })
      .eq("id", journeyId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw new Error(`Failed to activate journey: ${error.message}`);

    const activatedJourney = data as Journey;

    // Enroll segment contacts immediately
    const { enrollSegmentContacts } = await import("@/lib/journeys/engine");
    await enrollSegmentContacts(admin, tenantId, activatedJourney);

    // Re-fetch to get updated trigger_config with enrollment_status
    return getJourney(admin, tenantId, journeyId);
  }

  // Event trigger — existing behavior
  const { data, error } = await admin
    .from("journey")
    .update({ status: "active" })
    .eq("id", journeyId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new Error(`Failed to activate journey: ${error.message}`);
  return data as Journey;
}

export async function pauseJourney(
  admin: SupabaseClient,
  tenantId: string,
  journeyId: string
): Promise<Journey> {
  const journey = await getJourney(admin, tenantId, journeyId);
  if (journey.status !== "active") {
    throw new Error(`Cannot pause journey in '${journey.status}' status`);
  }

  const { data, error } = await admin
    .from("journey")
    .update({ status: "paused" })
    .eq("id", journeyId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new Error(`Failed to pause journey: ${error.message}`);
  return data as Journey;
}

export async function resumeJourney(
  admin: SupabaseClient,
  tenantId: string,
  journeyId: string
): Promise<Journey> {
  const journey = await getJourney(admin, tenantId, journeyId);
  if (journey.status !== "paused") {
    throw new Error(`Cannot resume journey in '${journey.status}' status`);
  }

  const { data, error } = await admin
    .from("journey")
    .update({ status: "active" })
    .eq("id", journeyId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new Error(`Failed to resume journey: ${error.message}`);
  return data as Journey;
}

export async function archiveJourney(
  admin: SupabaseClient,
  tenantId: string,
  journeyId: string
): Promise<Journey> {
  const journey = await getJourney(admin, tenantId, journeyId);
  if (journey.status === "archived") {
    throw new Error("Journey is already archived");
  }

  // Exit all active enrollments
  await admin
    .from("journey_enrollment")
    .update({
      status: "exited",
      exit_reason: "journey_archived",
    })
    .eq("journey_id", journeyId)
    .in("status", ["active", "waiting"]);

  const { data, error } = await admin
    .from("journey")
    .update({ status: "archived" })
    .eq("id", journeyId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new Error(`Failed to archive journey: ${error.message}`);
  return data as Journey;
}

// ============================================================
// Analytics
// ============================================================

export async function getJourneyStats(
  admin: SupabaseClient,
  tenantId: string,
  journeyId: string
): Promise<JourneyStats> {
  // Count enrollments by status
  const { data: enrollments } = await admin
    .from("journey_enrollment")
    .select("status")
    .eq("journey_id", journeyId)
    .eq("tenant_id", tenantId);

  const rows = enrollments ?? [];
  const enrolled = rows.length;
  const active = rows.filter(
    (e) => e.status === "active" || e.status === "waiting"
  ).length;
  const completed = rows.filter((e) => e.status === "completed").length;
  const exited = rows.filter((e) => e.status === "exited").length;

  const conversion_rate =
    enrolled > 0 ? Math.round((completed / enrolled) * 1000) / 10 : 0;

  return { enrolled, active, completed, exited, conversion_rate };
}

// ============================================================
// Enrollment
// ============================================================

export async function enrollContact(
  admin: SupabaseClient,
  tenantId: string,
  journeyId: string,
  contactId: string,
  startNodeId?: string
): Promise<JourneyEnrollment> {
  const { data, error } = await admin
    .from("journey_enrollment")
    .insert({
      tenant_id: tenantId,
      contact_id: contactId,
      journey_id: journeyId,
      current_node_id: startNodeId ?? null,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    // Unique constraint violation = already enrolled
    if (error.code === "23505") {
      throw new Error("Contact is already enrolled in this journey");
    }
    throw new Error(`Failed to enroll contact: ${error.message}`);
  }

  return data as JourneyEnrollment;
}

export async function getEnrollments(
  admin: SupabaseClient,
  tenantId: string,
  journeyId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ enrollments: JourneyEnrollment[]; total: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const { count } = await admin
    .from("journey_enrollment")
    .select("*", { count: "exact", head: true })
    .eq("journey_id", journeyId)
    .eq("tenant_id", tenantId);

  const { data, error } = await admin
    .from("journey_enrollment")
    .select("*")
    .eq("journey_id", journeyId)
    .eq("tenant_id", tenantId)
    .order("entered_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch enrollments: ${error.message}`);

  return {
    enrollments: (data ?? []) as JourneyEnrollment[],
    total: count ?? 0,
  };
}

// ============================================================
// Graph helpers
// ============================================================

export function validateJourneyGraph(graph: JourneyGraph): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    errors.push("Journey must have at least one node");
    return { valid: false, errors };
  }

  // Must have exactly one trigger node
  const triggers = graph.nodes.filter((n) => n.type === "trigger");
  if (triggers.length === 0) {
    errors.push("Journey must have a trigger node");
  } else if (triggers.length > 1) {
    errors.push("Journey can only have one trigger node");
  } else {
    // Validate trigger configuration
    const triggerData = triggers[0].data as TriggerNodeData;
    const triggerType = triggerData.trigger_type ?? "event";
    if (triggerType === "event" && !triggerData.event_type) {
      errors.push("Event trigger must have an event type configured");
    }
    if (triggerType === "segment" && !triggerData.segment_id) {
      errors.push("Segment trigger must have a segment selected");
    }
  }

  // All action nodes with send_* must have a content_template_id
  const actionNodes = graph.nodes.filter((n) => n.type === "action");
  for (const node of actionNodes) {
    const data = node.data as { action_type?: string; content_template_id?: string };
    if (
      data.action_type?.startsWith("send_") &&
      !data.content_template_id
    ) {
      errors.push(`Action node "${node.id}" is missing a content template`);
    }
  }

  // Check connectivity: every non-trigger node should have at least one incoming edge
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const targetIds = new Set(graph.edges.map((e) => e.target));
  for (const node of graph.nodes) {
    if (node.type !== "trigger" && !targetIds.has(node.id)) {
      errors.push(`Node "${node.id}" has no incoming connection`);
    }
  }

  // Check that edges reference valid nodes
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge references unknown source node "${edge.source}"`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge references unknown target node "${edge.target}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getNextNodes(
  graph: JourneyGraph,
  nodeId: string,
  sourceHandle?: string
): string[] {
  return graph.edges
    .filter(
      (e) =>
        e.source === nodeId &&
        (sourceHandle === undefined || e.sourceHandle === sourceHandle)
    )
    .map((e) => e.target);
}
