import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.text();

  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  const shopDomain = request.headers.get("x-shopify-shop-domain");

  if (!hmac || !topic || !shopDomain) {
    return NextResponse.json(
      { error: "Missing required Shopify headers" },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  // Look up tenant by shop domain
  const { data: tenant, error: tenantError } = await admin
    .from("tenant")
    .select("id, shopify_webhook_secret")
    .eq("shopify_store_url", shopDomain)
    .maybeSingle();

  if (tenantError || !tenant) {
    return NextResponse.json(
      { error: "Unknown shop domain" },
      { status: 404 }
    );
  }

  if (!tenant.shopify_webhook_secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Verify HMAC-SHA256 signature
  const computed = crypto
    .createHmac("sha256", tenant.shopify_webhook_secret)
    .update(body, "utf8")
    .digest("base64");

  const expected = Buffer.from(hmac, "base64");
  const actual = Buffer.from(computed, "base64");

  if (
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  // Insert raw event — return 200 immediately
  const payload = JSON.parse(body);

  const { error: insertError } = await admin.from("raw_event").insert({
    tenant_id: tenant.id,
    source: "shopify",
    event_type: topic,
    idempotency_key: webhookId ?? null,
    payload,
  });

  // Handle duplicate (unique constraint violation)
  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ status: "duplicate" });
    }
    console.error("raw_event insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to store event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "accepted" });
}
