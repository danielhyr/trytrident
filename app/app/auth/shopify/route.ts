import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

const SHOPIFY_SCOPES = [
  "read_customers",
  "read_orders",
  "read_checkouts",
  "read_products",
  "read_analytics",
].join(",");

/**
 * GET /auth/shopify?shop=mystore.myshopify.com
 *
 * Initiates Shopify OAuth by redirecting to Shopify's authorization page.
 * User must be authenticated (we need their tenant to store the token later).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const shop = searchParams.get("shop");

  if (!shop) {
    return NextResponse.redirect(
      new URL("/data?error=missing_shop", origin)
    );
  }

  // Validate shop format: must be xxx.myshopify.com
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  if (!shopRegex.test(shop)) {
    return NextResponse.redirect(
      new URL("/data?error=invalid_shop", origin)
    );
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Generate nonce for CSRF protection
  const nonce = crypto.randomBytes(16).toString("hex");

  // Use NGROK_URL for the Shopify-facing callback (Shopify needs a public URL)
  // Fall back to NEXT_PUBLIC_APP_URL for local-only testing
  const baseUrl = process.env.NGROK_URL || process.env.NEXT_PUBLIC_APP_URL;
  const redirectUri = `${baseUrl}/auth/shopify/callback`;
  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", process.env.SHOPIFY_CLIENT_ID!);
  authUrl.searchParams.set("scope", SHOPIFY_SCOPES);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", nonce);

  // Store nonce in a cookie for validation in the callback
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("shopify_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
