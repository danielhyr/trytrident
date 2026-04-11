import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as segmentsAPI from "@/lib/api/segments";
import { evaluateRules } from "@/lib/segments/evaluator";
import { normalizeRulesConfig } from "@/lib/segments/types";

interface ContactDetailProps {
  params: Promise<{ id: string }>;
}

const STAGE_COLORS: Record<string, string> = {
  vip: "bg-accent/10 text-accent",
  active: "bg-success/10 text-success",
  at_risk: "bg-warning/10 text-warning",
  lapsed: "bg-danger/10 text-danger",
  prospect: "bg-gray-100 text-text-main-muted",
};

export default async function ContactDetailPage({ params }: ContactDetailProps) {
  const { id: contactId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("user_tenant")
    .select("tenant_id, role")
    .eq("user_id", user!.id)
    .limit(1);

  const membership =
    memberships && memberships.length > 0 ? memberships[0] : null;
  const tenantId = membership?.tenant_id as string;

  if (!tenantId) notFound();

  // Fetch contact
  const { data: contact, error: contactError } = await admin
    .from("contact")
    .select("*")
    .eq("id", contactId)
    .eq("tenant_id", tenantId)
    .single();

  if (contactError || !contact) notFound();

  // Fetch recent events + active segments in parallel
  const [eventsResult, segments] = await Promise.all([
    admin
      .from("event")
      .select("id, event_type, event_data, source, created_at")
      .eq("tenant_id", tenantId)
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(50),
    segmentsAPI.listSegments(admin, tenantId),
  ]);

  const events = eventsResult.data ?? [];

  // Check which active segments contain this contact
  const activeSegments = segments.filter((s) => s.status === "active");
  const contactSegments: Array<{ id: string; name: string }> = [];

  for (const seg of activeSegments) {
    const config = normalizeRulesConfig(seg.rules);
    const result = await evaluateRules(admin, tenantId, config, {
      countOnly: true,
      contactId,
    });
    if (result.count > 0) {
      contactSegments.push({ id: seg.id, name: seg.name });
    }
  }

  const fullName =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Back + header */}
      <div>
        <Link
          href="/audience"
          className="text-sm text-accent transition-opacity hover:opacity-80"
        >
          &larr; Audience
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-text-main">
            {fullName}
          </h1>
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 font-data text-xs font-medium ${
              STAGE_COLORS[contact.lifecycle_stage] ?? STAGE_COLORS.prospect
            }`}
          >
            {contact.lifecycle_stage.replace("_", " ")}
          </span>
          <span className="font-data text-sm text-text-main-muted">
            Score: {contact.engagement_score}
          </span>
        </div>
        <p className="mt-1 font-data text-sm text-text-main-muted">
          {contact.email ?? "No email"}
        </p>
      </div>

      {/* Two-column: Profile + Purchase history */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Profile */}
        <div className="rounded-[--radius-card] bg-white p-5">
          <h3 className="font-headline text-xs font-semibold uppercase text-text-main-muted">
            Profile
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <ProfileRow label="Phone" value={contact.phone} />
            <ProfileRow label="External ID" value={contact.external_id} />
            <ProfileRow label="Jurisdiction" value={contact.jurisdiction} />
            <ProfileRow label="Source" value={contact.consent_source} />
            <ProfileRow
              label="Created"
              value={new Date(contact.created_at).toLocaleDateString()}
            />
          </dl>
        </div>

        {/* Purchase history */}
        <div className="rounded-[--radius-card] bg-white p-5">
          <h3 className="font-headline text-xs font-semibold uppercase text-text-main-muted">
            Purchase History
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <ProfileRow
              label="Total Orders"
              value={String(contact.total_orders)}
            />
            <ProfileRow
              label="Total Revenue"
              value={`$${Number(contact.total_revenue).toFixed(2)}`}
            />
            <ProfileRow
              label="Avg Order Value"
              value={`$${Number(contact.avg_order_value).toFixed(2)}`}
            />
            <ProfileRow
              label="First Order"
              value={
                contact.first_order_at
                  ? new Date(contact.first_order_at).toLocaleDateString()
                  : null
              }
            />
            <ProfileRow
              label="Last Order"
              value={
                contact.last_order_at
                  ? new Date(contact.last_order_at).toLocaleDateString()
                  : null
              }
            />
          </dl>
        </div>
      </div>

      {/* Engagement timeline */}
      <div className="rounded-[--radius-card] bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="font-headline text-sm font-semibold text-text-main">
            Engagement Timeline
          </h3>
        </div>
        {events.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-main-muted">
            No events yet.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-text-main-muted">
                  <th className="px-4 py-2 font-data font-medium">Time</th>
                  <th className="px-4 py-2 font-data font-medium">Event</th>
                  <th className="px-4 py-2 font-data font-medium">Source</th>
                  <th className="px-4 py-2 font-data font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr
                    key={evt.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-2 font-data text-xs text-text-main-muted">
                      {new Date(evt.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <EventBadge type={evt.event_type} />
                    </td>
                    <td className="px-4 py-2 font-data text-xs text-text-main-muted">
                      {evt.source}
                    </td>
                    <td className="max-w-xs truncate px-4 py-2 font-data text-xs text-text-main-muted">
                      {formatEventData(evt.event_type, evt.event_data)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Segments + Consent row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Active segments */}
        <div className="rounded-[--radius-card] bg-white p-5">
          <h3 className="font-headline text-xs font-semibold uppercase text-text-main-muted">
            Active Segments
          </h3>
          {contactSegments.length === 0 ? (
            <p className="mt-3 text-sm text-text-main-muted">
              Not in any segments.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {contactSegments.map((seg) => (
                <Link
                  key={seg.id}
                  href="/audience"
                  className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1 font-data text-xs font-medium text-accent transition-colors hover:bg-accent/10"
                >
                  {seg.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Consent record */}
        <div className="rounded-[--radius-card] bg-white p-5">
          <h3 className="font-headline text-xs font-semibold uppercase text-text-main-muted">
            Consent Record
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <ProfileRow
              label="Email Consent"
              value={contact.email_consent ? "Granted" : "Not granted"}
            />
            <ProfileRow
              label="SMS Consent"
              value={contact.sms_consent ? "Granted" : "Not granted"}
            />
            <ProfileRow label="Source" value={contact.consent_source} />
            <ProfileRow
              label="Timestamp"
              value={
                contact.consent_timestamp
                  ? new Date(contact.consent_timestamp).toLocaleString()
                  : null
              }
            />
          </dl>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <>
      <dt className="font-data text-xs text-text-main-muted">{label}</dt>
      <dd className="font-data text-xs text-text-main">{value ?? "—"}</dd>
    </>
  );
}

function EventBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    "order.placed": "bg-success/10 text-success",
    "order.fulfilled": "bg-success/10 text-success",
    "order.cancelled": "bg-danger/10 text-danger",
    "checkout.started": "bg-warning/10 text-warning",
    "customer.created": "bg-accent/10 text-accent",
    "customer.updated": "bg-accent/10 text-accent",
    "email.opened": "bg-blue-50 text-blue-600",
    "email.clicked": "bg-blue-50 text-blue-600",
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 font-data text-xs font-medium ${
        colors[type] ?? "bg-gray-100 text-text-main-muted"
      }`}
    >
      {type}
    </span>
  );
}

function formatEventData(
  type: string,
  data: Record<string, unknown>
): string {
  if (type === "order.placed" || type === "order.cancelled") {
    const total = data.total_price;
    if (total) return `$${Number(total).toFixed(2)}`;
  }
  if (type === "checkout.started") {
    const total = data.total_price;
    if (total) return `Cart: $${Number(total).toFixed(2)}`;
  }
  return "";
}
