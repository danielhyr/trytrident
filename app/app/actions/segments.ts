"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthContext, isError } from "@/lib/auth/context";
import * as segmentsAPI from "@/lib/api/segments";
import { recalculateEngagement } from "@/lib/api/engagement";
import type {
  Segment,
  CreateSegmentInput,
  UpdateSegmentInput,
  RuleGroup,
  EvaluationResult,
} from "@/lib/segments/types";
import type { ContactListOptions, ContactListResult } from "@/lib/api/segments";

export async function createSegment(
  input: CreateSegmentInput
): Promise<{ segment: Segment } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const segment = await segmentsAPI.createSegment(
      ctx.admin,
      ctx.tenantId,
      input
    );
    revalidatePath("/audience");
    return { segment };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create segment" };
  }
}

export async function updateSegment(
  segmentId: string,
  input: UpdateSegmentInput
): Promise<{ segment: Segment } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const segment = await segmentsAPI.updateSegment(
      ctx.admin,
      ctx.tenantId,
      segmentId,
      input
    );
    revalidatePath("/audience");
    return { segment };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update segment" };
  }
}

export async function deleteSegment(
  segmentId: string
): Promise<{ success: true } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    await segmentsAPI.deleteSegment(ctx.admin, ctx.tenantId, segmentId);
    revalidatePath("/audience");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete segment" };
  }
}

export async function previewSegmentRules(
  rulesConfig: RuleGroup,
  options?: { limit?: number; offset?: number; countOnly?: boolean }
): Promise<{ result: EvaluationResult } | { error: string }> {
  const ctx = await resolveAuthContext();
  if (isError(ctx)) return ctx;

  try {
    const result = await segmentsAPI.evaluateSegmentRules(
      ctx.admin,
      ctx.tenantId,
      rulesConfig,
      options
    );
    return { result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Evaluation failed" };
  }
}

export async function fetchContacts(
  options?: ContactListOptions
): Promise<{ result: ContactListResult } | { error: string }> {
  const ctx = await resolveAuthContext();
  if (isError(ctx)) return ctx;

  try {
    const result = await segmentsAPI.listContacts(
      ctx.admin,
      ctx.tenantId,
      options
    );
    return { result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch contacts" };
  }
}

export async function triggerRefreshCounts(): Promise<
  { success: true } | { error: string }
> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    await segmentsAPI.refreshSegmentCounts(ctx.admin, ctx.tenantId);
    revalidatePath("/audience");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to refresh counts" };
  }
}

export async function fetchSegments(): Promise<
  { segments: Segment[] } | { error: string }
> {
  const ctx = await resolveAuthContext();
  if (isError(ctx)) return ctx;

  try {
    const segments = await segmentsAPI.listSegments(ctx.admin, ctx.tenantId);
    return { segments };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch segments" };
  }
}

export async function triggerEngagementRecalculation(): Promise<
  { updated: number } | { error: string }
> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const result = await recalculateEngagement(ctx.admin, ctx.tenantId);
    revalidatePath("/audience");
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Recalculation failed" };
  }
}
