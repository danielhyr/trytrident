import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { ShopifyConnect } from "../shopify-connect";
import { ProcessButton } from "../process-button";
import { ImportButton } from "../import-button";

export default async function ShopifyDetailPage() {
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

  let shopifyStoreUrl: string | null = null;
  if (tenantId) {
    const { data: tenantRows } = await supabase
      .from("tenant")
      .select("shopify_store_url")
      .eq("id", tenantId)
      .limit(1);
    shopifyStoreUrl = tenantRows?.[0]?.shopify_store_url ?? null;
  }

  const [rawTotal, rawUnprocessed, rawErrors, contactCount, eventCount, recentRaw] =
    await Promise.all([
      supabase.from("raw_event").select("*", { count: "exact", head: true }),
      supabase
        .from("raw_event")
        .select("*", { count: "exact", head: true })
        .eq("processed", false)
        .is("processing_error", null),
      supabase
        .from("raw_event")
        .select("*", { count: "exact", head: true })
        .not("processing_error", "is", null),
      supabase.from("contact").select("*", { count: "exact", head: true }),
      supabase.from("event").select("*", { count: "exact", head: true }),
      supabase
        .from("raw_event")
        .select("id, source, event_type, processed, processing_error, received_at")
        .order("received_at", { ascending: false })
        .limit(20),
    ]);

  const stats = {
    rawTotal: rawTotal.count ?? 0,
    rawUnprocessed: rawUnprocessed.count ?? 0,
    rawErrors: rawErrors.count ?? 0,
    contacts: contactCount.count ?? 0,
    events: eventCount.count ?? 0,
  };

  const recentEvents = recentRaw.data ?? [];
  void createAdminClient; // available if needed

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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#96BF48]/10">
          <ShopifyLogo />
        </div>
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-text-main">
            Shopify
          </h1>
          {shopifyStoreUrl ? (
            <p className="flex items-center gap-1.5 font-body text-sm text-success">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
              Connected &middot; {shopifyStoreUrl}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 font-body text-sm text-text-main-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300" />
              Not connected
            </p>
          )}
        </div>
      </div>

      {/* Connect / Disconnect */}
      <ShopifyConnect
        shopifyStoreUrl={shopifyStoreUrl}
        canManage={["owner", "admin"].includes(role)}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Raw Events" value={stats.rawTotal} />
        <StatCard
          label="Unprocessed"
          value={stats.rawUnprocessed}
          highlight={stats.rawUnprocessed > 0}
        />
        <StatCard
          label="Errors"
          value={stats.rawErrors}
          danger={stats.rawErrors > 0}
        />
        <StatCard label="Contacts" value={stats.contacts} />
        <StatCard label="Canonical Events" value={stats.events} />
      </div>

      {/* Pipeline actions */}
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-sm font-semibold text-text-main">
          Event Pipeline
        </h2>
        <div className="flex items-center gap-3">
          {shopifyStoreUrl && <ImportButton />}
          <ProcessButton />
        </div>
      </div>

      {!tenantId && (
        <div className="rounded-[--radius-card] bg-white p-4 text-sm text-text-main-muted">
          No tenant found. Ensure your account is linked to a workspace.
        </div>
      )}

      {/* Recent raw events */}
      <div className="rounded-[--radius-card] bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-headline text-sm font-semibold text-text-main">
            Recent Raw Events
          </h2>
        </div>
        {recentEvents.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-main-muted">
            {shopifyStoreUrl
              ? "No events yet. Webhooks will appear here once Shopify sends data."
              : "Connect your Shopify store above to start receiving events."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-text-main-muted">
                  <th className="px-4 py-2 font-body font-medium">Time</th>
                  <th className="px-4 py-2 font-body font-medium">Source</th>
                  <th className="px-4 py-2 font-body font-medium">Event Type</th>
                  <th className="px-4 py-2 font-body font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((evt) => (
                  <tr key={evt.id} className="border-b border-gray-100 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 font-data text-xs text-text-main-muted">
                      {new Date(evt.received_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-data text-xs text-text-main">
                      {evt.source}
                    </td>
                    <td className="px-4 py-2 font-data text-xs text-text-main">
                      {evt.event_type}
                    </td>
                    <td className="px-4 py-2">
                      <EventStatus
                        processed={evt.processed}
                        error={evt.processing_error}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[--radius-card] bg-white px-4 py-3">
      <p className="font-body text-xs font-medium uppercase tracking-wider text-text-main-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-headline text-2xl font-semibold ${
          danger
            ? "text-danger"
            : highlight
              ? "text-warning"
              : "text-text-main"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EventStatus({
  processed,
  error,
}: {
  processed: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1 font-data text-xs text-danger">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger" />
        Error
      </span>
    );
  }
  if (processed) {
    return (
      <span className="inline-flex items-center gap-1 font-data text-xs text-success">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
        Processed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-data text-xs text-warning">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
      Pending
    </span>
  );
}

function ShopifyLogo() {
  return (
    <svg viewBox="0 0 109.5 124.5" className="h-5 w-5" fill="#96BF48">
      <path d="M95.6 28.2c-.1-.6-.6-1-1.1-1-.5 0-10.2-.8-10.2-.8s-6.7-6.7-7.5-7.5c-.8-.8-2.3-.5-2.9-.4-.1 0-1.6.5-4.1 1.3-2.4-7-6.7-13.4-14.2-13.4h-.7c-2.1-2.8-4.7-4-6.9-4-17.1 0-25.3 21.4-27.8 32.3-6.6 2-11.2 3.5-11.8 3.7-3.7 1.2-3.8 1.3-4.3 4.7C3.8 45.6 0 77.4 0 77.4l71.5 13.4 38-8.3S95.7 28.8 95.6 28.2zM67.3 21.6l-5.6 1.7c0-3-.4-7.3-1.8-10.9 4.5.8 6.7 6 7.4 9.2zm-9.5 2.9-11.4 3.5c1.1-4.3 3.2-8.5 5.7-11.3 1-.1 2.3-2.6 3.9-4.9 2.5 3.3 2 8.6 1.8 12.7zm-8-17.4c1.3 0 2.3.4 3.3 1.3-4.9 2.3-10.2 8.1-12.4 19.7l-9 2.8C34.1 21.5 40 7.1 49.8 7.1z" />
      <path d="M94.5 27.2c-.5 0-10.2-.8-10.2-.8s-6.7-6.7-7.5-7.5c-.3-.3-.7-.4-1-.5l-4.3 87 38-8.3S95.7 28.8 95.6 28.2c-.1-.6-.6-1-1.1-1" fill="#5E8E3E" />
      <path d="M57.4 43.6 53 57.4s-4.1-2.2-9.1-2.2c-7.4 0-7.7 4.6-7.7 5.8 0 6.3 16.5 8.7 16.5 23.5 0 11.6-7.4 19.1-17.3 19.1-11.9 0-18-7.5-18-7.5l3.2-10.5s6.3 5.4 11.6 5.4c3.4 0 4.9-2.7 4.9-4.7 0-8.2-13.5-8.6-13.5-22.1 0-11.4 8.2-22.4 24.6-22.4 6.4-.1 9.2 1.8 9.2 1.8" fill="#fff" />
    </svg>
  );
}
