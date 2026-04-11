import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DataPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("user_tenant")
    .select("tenant_id")
    .eq("user_id", user!.id)
    .limit(1);

  const tenantId = memberships?.[0]?.tenant_id as string | undefined;

  let shopifyStoreUrl: string | null = null;
  if (tenantId) {
    const { data: tenantRows } = await supabase
      .from("tenant")
      .select("shopify_store_url")
      .eq("id", tenantId)
      .limit(1);
    shopifyStoreUrl = tenantRows?.[0]?.shopify_store_url ?? null;
  }

  const isShopifyConnected = !!shopifyStoreUrl;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-text-main">
          Data Sources
        </h1>
        <p className="mt-1 font-body text-sm text-text-main-muted">
          Connect and manage the sources that feed your marketing pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Shopify */}
        <Link href="/data/shopify" className="group">
          <div className="flex h-full flex-col rounded-[--radius-card] bg-white p-5 shadow-sm transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#96BF48]/10">
                <ShopifyLogo />
              </div>
              {isShopifyConnected ? (
                <span className="inline-flex items-center gap-1.5 font-body text-xs text-success">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-body text-xs text-text-main-muted">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300" />
                  Not connected
                </span>
              )}
            </div>
            <div className="mt-4 flex-1">
              <p className="font-headline text-base font-semibold text-text-main">
                Shopify
              </p>
              <p className="mt-1 font-body text-sm text-text-main-muted">
                Orders, customers &amp; cart events via webhooks + historical import
              </p>
            </div>
            {shopifyStoreUrl && (
              <p className="mt-3 font-data text-xs text-text-main-muted truncate">
                {shopifyStoreUrl}
              </p>
            )}
          </div>
        </Link>

        {/* Webhooks / Custom API */}
        <Link href="/data/webhooks" className="group">
          <div className="flex h-full flex-col rounded-[--radius-card] bg-white p-5 shadow-sm transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <WebhookIcon />
              </div>
              <span className="inline-flex items-center gap-1.5 font-body text-xs text-success">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                Active
              </span>
            </div>
            <div className="mt-4 flex-1">
              <p className="font-headline text-base font-semibold text-text-main">
                Webhooks / Custom API
              </p>
              <p className="mt-1 font-body text-sm text-text-main-muted">
                Send custom events from your backend via HTTP API
              </p>
            </div>
          </div>
        </Link>

        {/* SendGrid — Coming Soon */}
        <ComingSoonCard
          icon={<SendGridIcon />}
          iconBg="bg-[#1A82E2]/10"
          name="SendGrid"
          description="Email delivery events — opens, clicks, bounces"
        />

        {/* Twilio — Coming Soon */}
        <ComingSoonCard
          icon={<TwilioIcon />}
          iconBg="bg-[#F22F46]/10"
          name="Twilio"
          description="SMS delivery status callbacks"
        />
      </div>
    </div>
  );
}

function ComingSoonCard({
  icon,
  iconBg,
  name,
  description,
}: {
  icon: React.ReactNode;
  iconBg: string;
  name: string;
  description: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-[--radius-card] bg-white p-5 opacity-50">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-body text-xs text-text-main-muted">
          Coming Soon
        </span>
      </div>
      <div className="mt-4 flex-1">
        <p className="font-headline text-base font-semibold text-text-main">
          {name}
        </p>
        <p className="mt-1 font-body text-sm text-text-main-muted">
          {description}
        </p>
      </div>
    </div>
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

function WebhookIcon() {
  return (
    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 0-4.5H6v4.5Zm0 0H3.75m2.25 0v4.5m0-4.5h2.25m-2.25 4.5H3.75m2.25 0v.375a2.25 2.25 0 1 1-4.5 0V15m4.5 0h.375" />
    </svg>
  );
}

function SendGridIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1A82E2">
      <path d="M8 0H0v8h8V0zm8 8H8v8h8V8zm8-8h-8v8h8V0zm-8 16h-8v8h8v-8z" />
    </svg>
  );
}

function TwilioIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#F22F46">
      <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm0 20.59c-4.743 0-8.59-3.847-8.59-8.59S7.257 3.41 12 3.41 20.59 7.257 20.59 12 16.743 20.59 12 20.59zm4.122-12.712a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm-8.244 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm8.244 8.244a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm-8.244 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z" />
    </svg>
  );
}
