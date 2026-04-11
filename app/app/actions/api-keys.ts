"use server";

import { resolveAuthContext, isError } from "@/lib/auth/context";
import * as apiKeysAPI from "@/lib/api/api-keys";
import type { ApiKey, CreateApiKeyResult } from "@/lib/api/api-keys";

export async function createApiKey(
  label?: string
): Promise<{ result: CreateApiKeyResult } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const result = await apiKeysAPI.createApiKey(
      ctx.admin,
      ctx.tenantId,
      ctx.userId,
      label
    );
    return { result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create API key" };
  }
}

export async function listApiKeys(): Promise<
  { keys: ApiKey[] } | { error: string }
> {
  const ctx = await resolveAuthContext();
  if (isError(ctx)) return ctx;

  try {
    const keys = await apiKeysAPI.listApiKeys(ctx.admin, ctx.tenantId);
    return { keys };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to list API keys" };
  }
}

export async function revokeApiKey(
  keyId: string
): Promise<{ success: true } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    await apiKeysAPI.revokeApiKey(ctx.admin, ctx.tenantId, keyId);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to revoke API key" };
  }
}
