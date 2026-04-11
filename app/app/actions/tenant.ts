"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthContext, isError } from "@/lib/auth/context";
import {
  getTenantName as getTenantNameAPI,
  updateTenantName as updateTenantNameAPI,
} from "@/lib/api/tenant";

export async function getTenantName(): Promise<{
  name?: string;
  error?: string;
}> {
  const ctx = await resolveAuthContext();
  if (isError(ctx)) return ctx;

  try {
    const name = await getTenantNameAPI(ctx.admin, ctx.tenantId);
    return { name };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to load" };
  }
}

export async function updateTenantName(
  name: string
): Promise<{ name?: string; error?: string }> {
  const ctx = await resolveAuthContext("owner");
  if (isError(ctx)) return ctx;

  try {
    const updated = await updateTenantNameAPI(ctx.admin, ctx.tenantId, name);
    revalidatePath("/", "layout");
    return { name: updated };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Update failed" };
  }
}
