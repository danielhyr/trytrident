import type {
  CanonicalEventType,
  ContactIdentifiers,
  ContactUpdate,
  NormalizeResult,
  Normalizer,
  OrderDelta,
} from "../types";

/**
 * Pass-through normalizer for pre-normalized API payloads.
 *
 * The caller is responsible for shaping the event to the expected
 * contract (event_type, identifiers, optional contact/order objects).
 * This normalizer extracts those fields into the canonical result
 * without performing any transformation.
 *
 * Request shape:
 * {
 *   event_type: string
 *   email?: string
 *   phone?: string
 *   external_id?: string
 *   properties?: Record<string, unknown>   → event_data
 *   contact?: {
 *     first_name?: string
 *     last_name?: string
 *     email_consent?: boolean
 *     sms_consent?: boolean
 *     custom_attributes?: Record<string, unknown>
 *   }
 *   order?: {
 *     total_price?: number
 *     delta?: "placed" | "cancelled"
 *   }
 *   source?: DataSource   (not used here — processor sets it from raw_event.source)
 *   timestamp?: string
 * }
 */
export class ApiNormalizer implements Normalizer {
  normalize(
    eventType: string,
    payload: Record<string, unknown>
  ): NormalizeResult {
    // --- Identifiers ---
    const identifiers: ContactIdentifiers = {};
    if (typeof payload.email === "string") identifiers.email = payload.email;
    if (typeof payload.phone === "string") identifiers.phone = payload.phone;
    if (typeof payload.external_id === "string")
      identifiers.external_id = payload.external_id;

    // --- Contact update ---
    const contactUpdate: ContactUpdate = {};
    const contact = payload.contact as Record<string, unknown> | undefined;
    if (contact) {
      if (typeof contact.first_name === "string")
        contactUpdate.first_name = contact.first_name;
      if (typeof contact.last_name === "string")
        contactUpdate.last_name = contact.last_name;
      if (typeof contact.email_consent === "boolean")
        contactUpdate.email_consent = contact.email_consent;
      if (typeof contact.sms_consent === "boolean")
        contactUpdate.sms_consent = contact.sms_consent;
    }

    // --- Order delta ---
    let orderDelta: OrderDelta | null = null;
    const order = payload.order as Record<string, unknown> | undefined;
    if (order) {
      const totalPrice =
        typeof order.total_price === "number" ? order.total_price : 0;
      const delta = order.delta;
      if (delta === "placed") {
        orderDelta = { orders_delta: 1, revenue_delta: totalPrice };
      } else if (delta === "cancelled") {
        orderDelta = { orders_delta: -1, revenue_delta: -totalPrice };
      }
    }

    // --- Event data ---
    const eventData =
      typeof payload.properties === "object" && payload.properties !== null
        ? (payload.properties as Record<string, unknown>)
        : {};

    return {
      canonicalEvent: {
        event_type: eventType as CanonicalEventType,
        event_data: eventData,
        source: "api",
      },
      identifiers,
      contactUpdate,
      orderDelta,
    };
  }
}
