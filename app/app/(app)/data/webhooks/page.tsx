import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { ApiKeyManager } from "@/app/(app)/settings/api-key-manager";
import { listApiKeys } from "@/lib/api/api-keys";
import type { ApiKey } from "@/lib/api/api-keys";

export default async function WebhooksDetailPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("user_tenant")
    .select("tenant_id, role")
    .eq("user_id", user!.id)
    .limit(1);

  const membership = memberships?.[0] ?? null;
  const tenantId = membership?.tenant_id as string | undefined;
  const role = membership?.role ?? "owner";
  const isAdmin = ["owner", "admin"].includes(role);

  let apiKeys: ApiKey[] = [];
  if (tenantId) {
    const admin = createAdminClient();
    try {
      apiKeys = await listApiKeys(admin, tenantId);
    } catch {
      // Non-fatal — table may not exist until migration runs
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Back link */}
      <div>
        <Link
          href="/data"
          className="inline-flex items-center gap-1.5 font-body text-sm text-text-main-muted transition-colors hover:text-text-main"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Data Sources
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <WebhookIcon />
        </div>
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-text-main">
            Webhooks / Custom API
          </h1>
          <p className="flex items-center gap-1.5 font-body text-sm text-success">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
            Active
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="font-body text-sm text-text-main-muted">
        Send custom events from any HTTP client, Zapier, or your backend. Use API keys to authenticate your requests.
      </p>

      {/* API Keys */}
      <div className="rounded-[--radius-card] bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-headline text-sm font-semibold text-text-main">
            API Keys
          </h2>
          <p className="mt-0.5 text-xs text-text-main-muted">
            Authenticate your webhook requests with a bearer token.
          </p>
        </div>
        <div className="p-4">
          {isAdmin ? (
            <ApiKeyManager initialKeys={apiKeys} />
          ) : (
            <p className="text-sm text-text-main-muted">
              Only admins and owners can manage API keys.
            </p>
          )}
        </div>
      </div>

      {/* Endpoint reference */}
      <div className="rounded-[--radius-card] bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-headline text-sm font-semibold text-text-main">
            Event Schema
          </h2>
          <p className="mt-0.5 text-xs text-text-main-muted">
            Expected payload structure for custom events.
          </p>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="font-body text-xs font-medium uppercase tracking-wider text-text-main-muted mb-2">
              Required fields
            </p>
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2 text-left font-body text-xs font-medium text-text-main-muted">Field</th>
                    <th className="px-4 py-2 text-left font-body text-xs font-medium text-text-main-muted">Type</th>
                    <th className="px-4 py-2 text-left font-body text-xs font-medium text-text-main-muted">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2 font-data text-xs text-text-main">event_type</td>
                    <td className="px-4 py-2 font-data text-xs text-text-main-muted">string</td>
                    <td className="px-4 py-2 font-body text-xs text-text-main-muted">e.g. <code className="font-data">custom.signup</code></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2 font-data text-xs text-text-main">email</td>
                    <td className="px-4 py-2 font-data text-xs text-text-main-muted">string</td>
                    <td className="px-4 py-2 font-body text-xs text-text-main-muted">Contact identifier (email or phone required)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-data text-xs text-text-main">properties</td>
                    <td className="px-4 py-2 font-data text-xs text-text-main-muted">object</td>
                    <td className="px-4 py-2 font-body text-xs text-text-main-muted">Any additional event data (optional)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebhookIcon() {
  return (
    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 0-4.5H6v4.5Zm0 0H3.75m2.25 0v4.5m0-4.5h2.25m-2.25 4.5H3.75m2.25 0v.375a2.25 2.25 0 1 1-4.5 0V15m4.5 0h.375" />
    </svg>
  );
}
