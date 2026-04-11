import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AuthContext {
  admin: SupabaseClient;
  tenantId: string;
  role: string;
  userId: string;
}

type AuthResult = AuthContext | { error: string };

/**
 * Resolve the current user's auth context from cookies.
 * Used by server actions to get tenantId + admin client.
 *
 * The chat route handler will NOT use this — it resolves
 * auth from the request and passes (admin, tenantId) directly
 * to lib/api/ functions.
 */
export async function resolveAuthContext(
  requiredRole?: "owner" | "admin"
): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: memberships } = await supabase
    .from("user_tenant")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .limit(1);

  const membership =
    memberships && memberships.length > 0 ? memberships[0] : null;

  if (!membership) {
    return { error: "No workspace found" };
  }

  if (
    requiredRole &&
    membership.role !== "owner" &&
    membership.role !== requiredRole
  ) {
    return { error: "Insufficient permissions" };
  }

  return {
    admin: createAdminClient(),
    tenantId: membership.tenant_id as string,
    role: membership.role as string,
    userId: user.id,
  };
}

export function isError(result: AuthResult): result is { error: string } {
  return "error" in result;
}
