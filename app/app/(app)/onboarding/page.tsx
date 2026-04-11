"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  missing_shop: "Please enter your Shopify store URL.",
  invalid_shop: "That doesn't look like a valid Shopify store URL.",
  missing_params: "The authorization response was incomplete. Please try again.",
  invalid_hmac: "Could not verify the response from Shopify. Please try again.",
  invalid_nonce: "The authorization session expired. Please try again.",
  no_tenant: "No workspace found. Please contact support.",
  insufficient_role: "Only workspace owners or admins can connect Shopify.",
  token_exchange_failed: "Failed to connect to Shopify. Please try again.",
  save_failed: "Failed to save your Shopify connection. Please try again.",
};

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const [shop, setShop] = useState("");
  const [loading, setLoading] = useState(false);

  function handleConnect() {
    // Normalize: strip protocol, trailing slashes, add .myshopify.com if needed
    let normalized = shop
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");

    if (!normalized.includes(".myshopify.com")) {
      // User probably typed just the store name, e.g. "my-store"
      normalized = `${normalized}.myshopify.com`;
    }

    setLoading(true);
    window.location.href = `/auth/shopify?shop=${encodeURIComponent(normalized)}`;
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg p-8 text-center">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
            <svg
              className="h-7 w-7 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 font-headline text-lg font-semibold text-text">
          Connect your Shopify store
        </h2>
        <p className="mb-6 text-sm text-text-muted">
          Import your customers, orders, and events to get started with
          automated marketing.
        </p>

        {/* Error message */}
        {errorCode && (
          <div className="mb-4 rounded-md bg-danger/10 px-4 py-2 text-sm text-danger">
            {ERROR_MESSAGES[errorCode] ?? "Something went wrong. Please try again."}
          </div>
        )}

        {/* Store URL input */}
        <div className="mb-4">
          <input
            type="text"
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder="my-store.myshopify.com"
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && shop.trim()) handleConnect();
            }}
          />
          <p className="mt-1.5 text-left text-xs text-text-muted">
            Enter your store name or full .myshopify.com URL
          </p>
        </div>

        {/* Connect button */}
        <button
          onClick={handleConnect}
          disabled={!shop.trim() || loading}
          className="mb-4 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Connecting..." : "Connect Shopify"}
        </button>

        <Link
          href="/chat"
          className="text-sm text-text-muted hover:text-accent hover:underline"
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}
