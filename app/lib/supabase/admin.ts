import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client that bypasses RLS.
 * Used by webhook handlers and the event processor —
 * never expose this client to browser code.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
