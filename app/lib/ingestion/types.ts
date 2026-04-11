// ============================================================
// Shared types for the data ingestion pipeline.
// Used by webhook handlers, normalizers, identity resolver,
// and the event processor.
// ============================================================

export type DataSource =
  | "shopify"
  | "sendgrid"
  | "twilio"
  | "api"
  | "csv"
  | "segment";

export type CanonicalEventType =
  // Customer lifecycle
  | "customer.created"
  | "customer.updated"
  // Orders
  | "order.placed"
  | "order.fulfilled"
  | "order.cancelled"
  // Cart / checkout
  | "checkout.started"
  | "checkout.updated"
  | "cart.abandoned"
  // Email engagement (SendGrid — future)
  | "email.delivered"
  | "email.opened"
  | "email.clicked"
  | "email.bounced"
  | "email.unsubscribed"
  | "email.complained"
  // SMS engagement (Twilio — future)
  | "sms.delivered"
  | "sms.failed"
  // Catalog
  | "product.created"
  | "product.updated";

/** Row shape from the raw_event table */
export interface RawEventRow {
  id: string;
  tenant_id: string;
  source: DataSource;
  event_type: string;
  idempotency_key: string | null;
  payload: Record<string, unknown>;
  processed: boolean;
  processing_error: string | null;
  received_at: string;
  processed_at: string | null;
}

/** Output of a normalizer: what to write to the canonical tables */
export interface CanonicalEvent {
  event_type: CanonicalEventType;
  event_data: Record<string, unknown>;
  source: DataSource;
}

/** Identifiers extracted from a raw event for identity resolution */
export interface ContactIdentifiers {
  external_id?: string;
  email?: string;
  phone?: string;
}

/** Profile fields to upsert on the contact */
export interface ContactUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  external_id?: string;
  email_consent?: boolean;
  sms_consent?: boolean;
  consent_source?: string;
  consent_timestamp?: string;
}

/**
 * Order delta — applied to contact's running totals.
 * Normalizers return deltas (e.g. +1 order, +$47.20 revenue)
 * so they stay pure (no DB access). The processor reads current
 * contact values and applies the delta.
 */
export interface OrderDelta {
  orders_delta: number; // +1 for order.placed, -1 for order.cancelled
  revenue_delta: number; // +total_price or -total_price
}

/** Full output of a normalizer for one raw event */
export interface NormalizeResult {
  canonicalEvent: CanonicalEvent;
  identifiers: ContactIdentifiers;
  contactUpdate: ContactUpdate;
  orderDelta: OrderDelta | null;
}

/** Interface all source normalizers implement */
export interface Normalizer {
  normalize(eventType: string, payload: Record<string, unknown>): NormalizeResult;
}

/** Stats returned by the event processor */
export interface ProcessingStats {
  processed: number;
  errors: number;
  contacts_created: number;
  contacts_updated: number;
  events_created: number;
}
