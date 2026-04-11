"use server";

import { resolveAuthContext, isError } from "@/lib/auth/context";
import { runEventProcessing, runHistoricalImport } from "@/lib/api/data";
import type { ProcessingStats } from "@/lib/ingestion/types";
import type { ImportProgress } from "@/lib/shopify/historical-import";

export async function triggerProcessing(): Promise<
  { stats: ProcessingStats } | { error: string }
> {
  const ctx = await resolveAuthContext();
  if (isError(ctx)) return ctx;

  const stats = await runEventProcessing(ctx.admin);
  return { stats };
}

export async function triggerHistoricalImport(): Promise<
  { progress: ImportProgress } | { error: string }
> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const progress = await runHistoricalImport(ctx.admin, ctx.tenantId);
    return { progress };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Import failed" };
  }
}
