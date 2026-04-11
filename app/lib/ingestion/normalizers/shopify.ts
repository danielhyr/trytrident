import type {
  CanonicalEventType,
  ContactIdentifiers,
  ContactUpdate,
  NormalizeResult,
  Normalizer,
  OrderDelta,
} from "../types";

// ============================================================
// Local Shopify payload interfaces (not exported).
// Only typed fields we actually read — Shopify payloads are huge.
// ============================================================

interface ShopifyCustomer {
  id: number;
  email?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  accepts_marketing?: boolean;
  accepts_marketing_updated_at?: string | null;
}

interface ShopifyOrder {
  id: number;
  total_price?: string;
  customer?: ShopifyCustomer | null;
  line_items?: Array<{
    product_id?: number;
    title?: string;
    quantity?: number;
    price?: string;
  }>;
}

interface ShopifyCheckout {
  id: number;
  token?: string;
  email?: string | null;
  phone?: string | null;
  total_price?: string;
  line_items?: Array<{
    product_id?: number;
    title?: string;
    quantity?: number;
    price?: string;
  }>;
}

// ============================================================
// Shopify normalizer
// ============================================================

export class ShopifyNormalizer implements Normalizer {
  normalize(
    eventType: string,
    payload: Record<string, unknown>
  ): NormalizeResult {
    switch (eventType) {
      case "customers/create":
        return this.normalizeCustomer("customer.created", payload);
      case "customers/update":
        return this.normalizeCustomer("customer.updated", payload);
      case "orders/create":
        return this.normalizeOrder("order.placed", payload);
      case "orders/fulfilled":
        return this.normalizeOrder("order.fulfilled", payload);
      case "orders/cancelled":
        return this.normalizeOrderCancelled(payload);
      case "checkouts/create":
        return this.normalizeCheckout("checkout.started", payload);
      case "checkouts/update":
        return this.normalizeCheckout("checkout.updated", payload);
      default:
        // Pass through as-is for unknown event types
        return {
          canonicalEvent: {
            event_type: eventType.replace("/", ".") as CanonicalEventType,
            event_data: payload,
            source: "shopify",
          },
          identifiers: {},
          contactUpdate: {},
          orderDelta: null,
        };
    }
  }

  private normalizeCustomer(
    canonicalType: "customer.created" | "customer.updated",
    payload: Record<string, unknown>
  ): NormalizeResult {
    const c = payload as unknown as ShopifyCustomer;

    const identifiers: ContactIdentifiers = {
      external_id: String(c.id),
    };
    if (c.email) identifiers.email = c.email;
    if (c.phone) identifiers.phone = c.phone;

    const contactUpdate: ContactUpdate = {};
    if (c.first_name) contactUpdate.first_name = c.first_name;
    if (c.last_name) contactUpdate.last_name = c.last_name;
    if (c.email) contactUpdate.email = c.email;
    if (c.phone) contactUpdate.phone = c.phone;

    if (c.accepts_marketing !== undefined) {
      contactUpdate.email_consent = c.accepts_marketing;
      contactUpdate.consent_source = "shopify_checkout";
      if (c.accepts_marketing_updated_at) {
        contactUpdate.consent_timestamp = c.accepts_marketing_updated_at;
      }
    }

    return {
      canonicalEvent: {
        event_type: canonicalType,
        event_data: {
          shopify_customer_id: c.id,
        },
        source: "shopify",
      },
      identifiers,
      contactUpdate,
      orderDelta: null,
    };
  }

  private normalizeOrder(
    canonicalType: "order.placed" | "order.fulfilled",
    payload: Record<string, unknown>
  ): NormalizeResult {
    const o = payload as unknown as ShopifyOrder;
    const totalPrice = parseFloat(o.total_price ?? "0");

    const identifiers: ContactIdentifiers = {};
    const contactUpdate: ContactUpdate = {};

    if (o.customer) {
      identifiers.external_id = String(o.customer.id);
      if (o.customer.email) identifiers.email = o.customer.email;
      if (o.customer.phone) identifiers.phone = o.customer.phone;
      if (o.customer.first_name)
        contactUpdate.first_name = o.customer.first_name;
      if (o.customer.last_name)
        contactUpdate.last_name = o.customer.last_name;
    }

    const orderDelta: OrderDelta | null =
      canonicalType === "order.placed"
        ? { orders_delta: 1, revenue_delta: totalPrice }
        : null;

    return {
      canonicalEvent: {
        event_type: canonicalType,
        event_data: {
          shopify_order_id: o.id,
          total_price: totalPrice,
          line_items: (o.line_items ?? []).map((li) => ({
            product_id: li.product_id,
            title: li.title,
            quantity: li.quantity,
            price: li.price,
          })),
        },
        source: "shopify",
      },
      identifiers,
      contactUpdate,
      orderDelta,
    };
  }

  private normalizeOrderCancelled(
    payload: Record<string, unknown>
  ): NormalizeResult {
    const o = payload as unknown as ShopifyOrder;
    const totalPrice = parseFloat(o.total_price ?? "0");

    const identifiers: ContactIdentifiers = {};
    if (o.customer) {
      identifiers.external_id = String(o.customer.id);
      if (o.customer.email) identifiers.email = o.customer.email;
    }

    return {
      canonicalEvent: {
        event_type: "order.cancelled",
        event_data: {
          shopify_order_id: o.id,
          total_price: totalPrice,
        },
        source: "shopify",
      },
      identifiers,
      contactUpdate: {},
      orderDelta: { orders_delta: -1, revenue_delta: -totalPrice },
    };
  }

  private normalizeCheckout(
    canonicalType: "checkout.started" | "checkout.updated",
    payload: Record<string, unknown>
  ): NormalizeResult {
    const ch = payload as unknown as ShopifyCheckout;

    const identifiers: ContactIdentifiers = {};
    if (ch.email) identifiers.email = ch.email;
    if (ch.phone) identifiers.phone = ch.phone;

    return {
      canonicalEvent: {
        event_type: canonicalType,
        event_data: {
          shopify_checkout_id: ch.id,
          token: ch.token,
          total_price: parseFloat(ch.total_price ?? "0"),
          line_items: (ch.line_items ?? []).map((li) => ({
            product_id: li.product_id,
            title: li.title,
            quantity: li.quantity,
            price: li.price,
          })),
        },
        source: "shopify",
      },
      identifiers,
      contactUpdate: {},
      orderDelta: null,
    };
  }
}
