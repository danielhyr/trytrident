import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerWebhooks } from "@/lib/shopify/webhooks";

/**
 * GET /auth/shopify/callback?code=X&hmac=X&shop=X&state=X&timestamp=X
 *
 * Shopify redirects here (via ngrok) after the user authorizes the app.
 *
 * Important: this runs on the ngrok domain, but the user's Supabase session
 * cookies live on localhost. So we can't use the session-based Supabase client.
 * Instead we use the admin client for all DB operations, and validate the
 * nonce via a query param we append to the Shopify redirect (since cookies
 * don't cross domains).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const hmac = searchParams.get("hmac");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const timestamp = searchParams.get("timestamp");

  // Where to redirect the user (their browser, on localhost)
  const localOrigin = process.env.NEXT_PUBLIC_APP_URL!;

  // 1. Check required params
  if (!code || !hmac || !shop || !state || !timestamp) {
    return NextResponse.redirect(`${localOrigin}/data?error=missing_params`);
  }

  // 2. Validate shop hostname
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  if (!shopRegex.test(shop)) {
    return NextResponse.redirect(`${localOrigin}/data?error=invalid_shop`);
  }

  // 3. Validate HMAC
  const params = new URLSearchParams(searchParams.toString());
  params.delete("hmac");
  params.sort();
  const message = params.toString();

  const computed = crypto
    .createHmac("sha256", process.env.SHOPIFY_CLIENT_SECRET!)
    .update(message)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmac))) {
    return NextResponse.redirect(`${localOrigin}/data?error=invalid_hmac`);
  }

  // 4. Exchange authorization code for offline access token
  const tokenResponse = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID!,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET!,
        code,
      }),
    }
  );

  if (!tokenResponse.ok) {
    console.error(
      "Shopify token exchange failed:",
      await tokenResponse.text()
    );
    return NextResponse.redirect(
      `${localOrigin}/data?error=token_exchange_failed`
    );
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    scope: string;
  };

  // 5. Generate a unique webhook secret for this tenant
  const webhookSecret = crypto.randomBytes(32).toString("hex");

  // 6. Find the tenant that initiated this OAuth flow.
  // We look up by the nonce (state) stored in a pending_shopify_nonce column,
  // OR we find the tenant that doesn't have Shopify connected yet.
  // For now: find the first tenant without a shopify_store_url
  // (single-tenant POC — there's only one).
  // TODO: Pass tenant_id through the OAuth state param for multi-tenant support.
  const admin = createAdminClient();

  // Find tenant that matches — for POC, get the tenant that doesn't have shopify connected
  const { data: tenants } = await admin
    .from("tenant")
    .select("id")
    .is("shopify_store_url", null)
    .limit(1);

  let tenantId = tenants?.[0]?.id;

  // If all tenants already have Shopify, try finding one that matches this shop
  // (reconnect scenario)
  if (!tenantId) {
    const { data: existing } = await admin
      .from("tenant")
      .select("id")
      .eq("shopify_store_url", shop)
      .limit(1);
    tenantId = existing?.[0]?.id;
  }

  if (!tenantId) {
    console.error("No tenant found for Shopify OAuth callback");
    return NextResponse.redirect(`${localOrigin}/data?error=no_tenant`);
  }

  // 7. Update tenant with Shopify credentials
  const { error: updateError } = await admin
    .from("tenant")
    .update({
      shopify_store_url: shop,
      shopify_access_token: tokenData.access_token,
      shopify_webhook_secret: webhookSecret,
      data_source: "shopify_webhook",
    })
    .eq("id", tenantId);

  if (updateError) {
    console.error("Failed to update tenant:", updateError);
    return NextResponse.redirect(`${localOrigin}/data?error=save_failed`);
  }

  // 8. Register webhooks on the Shopify store (use ngrok URL for webhook delivery)
  const ngrokUrl = process.env.NGROK_URL || process.env.NEXT_PUBLIC_APP_URL;
  const webhookCallbackUrl = `${ngrokUrl}/api/webhooks/shopify`;
  const webhookResult = await registerWebhooks(
    shop,
    tokenData.access_token,
    webhookCallbackUrl
  );

  if (webhookResult.errors.length > 0) {
    console.warn("Some webhooks failed to register:", webhookResult.errors);
  }

  console.log(
    `Shopify connected: ${shop}, webhooks registered: ${webhookResult.registered.length}`
  );

  // 9. Redirect user back to localhost Data page
  return NextResponse.redirect(`${localOrigin}/data`);
}
