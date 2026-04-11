/**
 * Register Shopify webhooks for a store after OAuth completes.
 * Uses Shopify REST Admin API (2024-01 stable).
 */

const WEBHOOK_TOPICS = [
  "customers/create",
  "customers/update",
  "orders/create",
  "orders/fulfilled",
  "orders/cancelled",
  "checkouts/create",
  "checkouts/update",
] as const;

const API_VERSION = "2024-01";

interface WebhookRegistrationResult {
  registered: string[];
  errors: Array<{ topic: string; error: string }>;
}

export async function registerWebhooks(
  shop: string,
  accessToken: string,
  callbackUrl: string
): Promise<WebhookRegistrationResult> {
  const result: WebhookRegistrationResult = {
    registered: [],
    errors: [],
  };

  for (const topic of WEBHOOK_TOPICS) {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/${API_VERSION}/webhooks.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: callbackUrl,
              format: "json",
            },
          }),
        }
      );

      if (response.ok) {
        result.registered.push(topic);
      } else {
        const body = await response.text();
        // 422 with "already exists" is fine — webhook was previously registered
        if (response.status === 422 && body.includes("already")) {
          result.registered.push(topic);
        } else {
          result.errors.push({ topic, error: `${response.status}: ${body}` });
        }
      }
    } catch (err) {
      result.errors.push({
        topic,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
