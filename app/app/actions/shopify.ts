"use server";

import { resolveAuthContext, isError } from "@/lib/auth/context";
import { disconnectShopifyStore } from "@/lib/api/shopify";

export async function disconnectShopify(): Promise<{ error?: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    await disconnectShopifyStore(ctx.admin, ctx.tenantId);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Disconnect failed" };
  }
}
