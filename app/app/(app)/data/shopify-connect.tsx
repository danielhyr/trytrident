"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { disconnectShopify } from "@/app/actions/shopify";

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

interface ShopifyConnectProps {
  shopifyStoreUrl: string | null;
  canManage: boolean;
}

export function ShopifyConnect({ shopifyStoreUrl, canManage }: ShopifyConnectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const [shop, setShop] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  function handleConnect() {
    let normalized = shop
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");

    if (!normalized.includes(".myshopify.com")) {
      normalized = `${normalized}.myshopify.com`;
    }

    setLoading(true);
    window.location.href = `/auth/shopify?shop=${encodeURIComponent(normalized)}`;
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const result = await disconnectShopify();
    setDisconnecting(false);
    setConfirmDisconnect(false);

    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  // Connected state
  if (shopifyStoreUrl) {
    return (
      <div className="rounded-[--radius-card] bg-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#96BF48]/10">
              <ShopifyLogo />
            </div>
            <div>
              <p className="font-data text-sm font-medium text-text-main">
                {shopifyStoreUrl}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-success">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                Connected &middot; Receiving webhooks
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              {confirmDisconnect ? (
                <>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {disconnecting ? "Disconnecting..." : "Yes, disconnect"}
                  </button>
                  <button
                    onClick={() => setConfirmDisconnect(false)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-text-main transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDisconnect(true)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-text-main-muted transition-colors hover:border-danger hover:text-danger"
                >
                  Disconnect
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not connected state
  return (
    <div className="rounded-[--radius-card] bg-white px-5 py-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <ShopifyLogo />
        </div>
        <div className="flex-1">
          <h3 className="font-headline text-sm font-semibold text-text-main">
            Connect your Shopify store
          </h3>
          <p className="mt-1 text-xs text-text-main-muted">
            Import customers, orders, and events to power automated marketing.
          </p>

          {errorCode && (
            <div className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
              {ERROR_MESSAGES[errorCode] ?? "Something went wrong. Please try again."}
            </div>
          )}

          {canManage && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                placeholder="my-store.myshopify.com"
                className="w-64 rounded-md border border-gray-300 bg-white px-3 py-1.5 font-data text-sm text-text-main placeholder:text-gray-400 focus:border-accent focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && shop.trim()) handleConnect();
                }}
              />
              <button
                onClick={handleConnect}
                disabled={!shop.trim() || loading}
                className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Connecting..." : "Connect"}
              </button>
            </div>
          )}

          {!canManage && (
            <p className="mt-3 text-xs text-text-main-muted">
              Ask a workspace owner or admin to connect Shopify.
            </p>
          )}
        </div>
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
