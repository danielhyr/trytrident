/**
 * POST /api/webhooks/ingest
 *
 * Generic API ingestion endpoint. External systems POST events here
 * using a Trident API key. Accepts single events or batches (max 100).
 *
 * Auth: Authorization: Bearer trident_live_<32hex>
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey } from "@/lib/api/api-keys";

interface IngestEvent {
  event_type: string;
  email?: string;
  phone?: string;
  external_id?: string;
  source?: string;
  properties?: Record<string, unknown>;
  contact?: {
    first_name?: string;
    last_name?: string;
    email_consent?: boolean;
    sms_consent?: boolean;
    custom_attributes?: Record<string, unknown>;
  };
  order?: {
    total_price?: number;
    delta?: "placed" | "cancelled";
  };
  idempotency_key?: string;
  timestamp?: string;
}

type SingleResult = { status: "accepted"; idempotency_key: string };
type BatchItemResult = {
  index: number;
  status: "accepted" | "duplicate" | "error";
  idempotency_key?: string;
  error?: string;
};

function validateEvent(
  event: unknown
): { valid: true; data: IngestEvent } | { valid: false; error: string } {
  if (typeof event !== "object" || event === null) {
    return { valid: false, error: "Event must be an object" };
  }
  const e = event as Record<string, unknown>;

  if (typeof e.event_type !== "string" || e.event_type.trim() === "") {
    return { valid: false, error: "event_type is required and must be a non-empty string" };
  }

  const hasIdentifier =
    typeof e.email === "string" ||
    typeof e.phone === "string" ||
    typeof e.external_id === "string";

  if (!hasIdentifier) {
    return {
      valid: false,
      error: "At least one identifier (email, phone, or external_id) is required",
    };
  }

  return { valid: true, data: e as unknown as IngestEvent };
}

async function processEvent(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  event: IngestEvent,
  headerIdempotencyKey: string | null,
  index?: number
): Promise<{ status: "accepted" | "duplicate" | "error"; idempotency_key?: string; error?: string }> {
  const idempotencyKey =
    event.idempotency_key ??
    headerIdempotencyKey ??
    crypto.randomUUID();

  const { error: insertError } = await admin.from("raw_event").insert({
    tenant_id: tenantId,
    source: event.source ?? "api",
    event_type: event.event_type,
    idempotency_key: idempotencyKey,
    payload: event,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { status: "duplicate", idempotency_key: idempotencyKey };
    }
    console.error(`[ingest] raw_event insert error (index ${index ?? 0}):`, insertError);
    return { status: "error", error: "Failed to store event" };
  }

  return { status: "accepted", idempotency_key: idempotencyKey };
}

export async function POST(request: Request) {
  // --- Auth ---
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith("trident_live_")) {
    return NextResponse.json({ error: "Invalid API key format" }, { status: 401 });
  }

  const admin = createAdminClient();
  const keyResult = await validateApiKey(admin, rawKey);
  if (!keyResult) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }

  const { tenantId } = keyResult;

  // --- Parse body ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const headerIdempotencyKey = request.headers.get("X-Idempotency-Key");

  // --- Single event ---
  if (!Array.isArray(body)) {
    const validation = validateEvent(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await processEvent(admin, tenantId, validation.data, headerIdempotencyKey);
    if (result.status === "error") {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      status: result.status,
      idempotency_key: result.idempotency_key,
    });
  }

  // --- Batch ---
  if (body.length > 100) {
    return NextResponse.json(
      { error: "Batch size exceeds maximum of 100 events" },
      { status: 400 }
    );
  }

  const results: BatchItemResult[] = [];

  for (let i = 0; i < body.length; i++) {
    const validation = validateEvent(body[i]);
    if (!validation.valid) {
      results.push({ index: i, status: "error", error: validation.error });
      continue;
    }

    const result = await processEvent(
      admin,
      tenantId,
      validation.data,
      headerIdempotencyKey,
      i
    );
    results.push({
      index: i,
      status: result.status,
      idempotency_key: result.idempotency_key,
      error: result.error,
    });
  }

  return NextResponse.json({ status: "accepted", results });
}
