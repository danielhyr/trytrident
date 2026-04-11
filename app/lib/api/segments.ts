/**
 * Segment API — business logic functions.
 *
 * Pure functions taking (admin, tenantId, ...) — no cookies, no Next.js coupling.
 * Called by server actions (UI) and chat tools (agent).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Segment,
  CreateSegmentInput,
  UpdateSegmentInput,
  EvaluationResult,
  RuleGroup,
} from "@/lib/segments/types";
import { normalizeRulesConfig } from "@/lib/segments/types";
import { evaluateRules, validateRules } from "@/lib/segments/evaluator";

export async function createSegment(
  admin: SupabaseClient,
  tenantId: string,
  input: CreateSegmentInput
): Promise<Segment> {
  const validationError = validateRules(input.rules);
  if (validationError) throw new Error(validationError);

  // Evaluate count for the new rules
  const { count } = await evaluateRules(admin, tenantId, input.rules, {
    countOnly: true,
  });

  const { data, error } = await admin
    .from("segment")
    .insert({
      tenant_id: tenantId,
      name: input.name,
      description: input.description ?? null,
      rules: input.rules,
      contact_count: count,
      created_by: input.created_by ?? "user",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`A segment named "${input.name}" already exists`);
    }
    throw new Error(`Failed to create segment: ${error.message}`);
  }

  return data as Segment;
}

export async function getSegment(
  admin: SupabaseClient,
  tenantId: string,
  segmentId: string
): Promise<Segment> {
  const { data, error } = await admin
    .from("segment")
    .select()
    .eq("id", segmentId)
    .eq("tenant_id", tenantId)
    .single();

  if (error) throw new Error(`Segment not found: ${error.message}`);
  return data as Segment;
}

export async function listSegments(
  admin: SupabaseClient,
  tenantId: string
): Promise<Segment[]> {
  const { data, error } = await admin
    .from("segment")
    .select()
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list segments: ${error.message}`);
  return (data ?? []) as Segment[];
}

export async function updateSegment(
  admin: SupabaseClient,
  tenantId: string,
  segmentId: string,
  input: UpdateSegmentInput
): Promise<Segment> {
  // If rules changed, re-validate and re-evaluate count
  let contact_count: number | undefined;
  if (input.rules) {
    const validationError = validateRules(input.rules);
    if (validationError) throw new Error(validationError);

    const { count } = await evaluateRules(admin, tenantId, input.rules, {
      countOnly: true,
    });
    contact_count = count;
  }

  const updatePayload: Record<string, unknown> = {};
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.rules !== undefined) updatePayload.rules = input.rules;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (contact_count !== undefined) updatePayload.contact_count = contact_count;

  const { data, error } = await admin
    .from("segment")
    .update(updatePayload)
    .eq("id", segmentId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`A segment named "${input.name}" already exists`);
    }
    throw new Error(`Failed to update segment: ${error.message}`);
  }

  return data as Segment;
}

export async function deleteSegment(
  admin: SupabaseClient,
  tenantId: string,
  segmentId: string
): Promise<void> {
  const { error } = await admin
    .from("segment")
    .delete()
    .eq("id", segmentId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(`Failed to delete segment: ${error.message}`);
}

export async function evaluateSegmentRules(
  admin: SupabaseClient,
  tenantId: string,
  ruleGroup: RuleGroup,
  options?: { limit?: number; offset?: number; countOnly?: boolean }
): Promise<EvaluationResult> {
  const validationError = validateRules(ruleGroup);
  if (validationError) throw new Error(validationError);

  return evaluateRules(admin, tenantId, ruleGroup, options);
}

export async function refreshSegmentCounts(
  admin: SupabaseClient,
  tenantId: string
): Promise<void> {
  const segments = await listSegments(admin, tenantId);
  const active = segments.filter((s) => s.status === "active");

  for (const segment of active) {
    const group = normalizeRulesConfig(segment.rules);
    const { count } = await evaluateRules(admin, tenantId, group, {
      countOnly: true,
    });
    await admin
      .from("segment")
      .update({ contact_count: count })
      .eq("id", segment.id);
  }
}

export interface ContactListOptions {
  limit?: number;
  offset?: number;
  search?: string;
  lifecycleStage?: string;
  sortBy?: string;
  sortAsc?: boolean;
}

export interface ContactListResult {
  contacts: Array<{
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    engagement_score: number;
    lifecycle_stage: string;
    total_orders: number;
    total_revenue: number;
    last_order_at: string | null;
    created_at: string;
  }>;
  total: number;
}

export async function listContacts(
  admin: SupabaseClient,
  tenantId: string,
  options?: ContactListOptions
): Promise<ContactListResult> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const sortBy = options?.sortBy ?? "created_at";
  const sortAsc = options?.sortAsc ?? false;

  // Count query
  let countQuery = admin
    .from("contact")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (options?.lifecycleStage) {
    countQuery = countQuery.eq("lifecycle_stage", options.lifecycleStage);
  }
  if (options?.search) {
    countQuery = countQuery.or(
      `email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`
    );
  }

  const { count } = await countQuery;

  // Data query
  let dataQuery = admin
    .from("contact")
    .select(
      "id, email, first_name, last_name, engagement_score, lifecycle_stage, total_orders, total_revenue, last_order_at, created_at"
    )
    .eq("tenant_id", tenantId)
    .order(sortBy, { ascending: sortAsc })
    .range(offset, offset + limit - 1);

  if (options?.lifecycleStage) {
    dataQuery = dataQuery.eq("lifecycle_stage", options.lifecycleStage);
  }
  if (options?.search) {
    dataQuery = dataQuery.or(
      `email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`
    );
  }

  const { data, error } = await dataQuery;
  if (error) throw new Error(`Failed to list contacts: ${error.message}`);

  return {
    contacts: data ?? [],
    total: count ?? 0,
  };
}
