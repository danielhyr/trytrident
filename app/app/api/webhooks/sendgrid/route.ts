import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * SendGrid Event Webhook handler.
 *
 * SendGrid posts batches of events (delivered, opened, clicked, bounced, etc.)
 * We match each event to a message via custom_args, then update:
 * 1. message status + timestamps
 * 2. decision_log outcome fields
 * 3. Insert canonical events for downstream processing
 * 4. Update contact engagement fields
 */

interface SendGridEvent {
  event: string;
  email: string;
  timestamp: number;
  sg_message_id?: string;
  tenant_id?: string;
  enrollment_id?: string;
  contact_id?: string;
  url?: string;
}

export async function POST(request: Request) {
  let events: SendGridEvent[];
  try {
    events = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(events)) {
    return NextResponse.json({ error: "Expected array" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Process each event (best-effort — don't fail the whole batch)
  for (const event of events) {
    try {
      await processOneEvent(admin, event);
    } catch (err) {
      console.error("SendGrid webhook event error:", err);
    }
  }

  return NextResponse.json({ status: "accepted" });
}

async function processOneEvent(
  admin: ReturnType<typeof createAdminClient>,
  event: SendGridEvent
): Promise<void> {
  // Try to match by custom_args first, then by sg_message_id
  const tenantId = event.tenant_id;
  const contactId = event.contact_id;

  // Find the message via custom_args or provider_message_id
  let messageQuery = admin.from("message").select("id, tenant_id, contact_id, journey_enrollment_id");

  if (tenantId && contactId) {
    messageQuery = messageQuery
      .eq("tenant_id", tenantId)
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(1);
  } else if (event.sg_message_id) {
    // sg_message_id has format "msgid.filter" — take the first part
    const providerId = event.sg_message_id.split(".")[0];
    messageQuery = messageQuery.eq("provider_message_id", providerId).limit(1);
  } else {
    return; // Can't match this event to a message
  }

  const { data: messages } = await messageQuery;
  if (!messages || messages.length === 0) return;

  const message = messages[0];

  // Map SendGrid event to status and timestamp field
  const statusMap: Record<string, { status: string; field: string }> = {
    delivered: { status: "delivered", field: "delivered_at" },
    open: { status: "opened", field: "opened_at" },
    click: { status: "clicked", field: "clicked_at" },
    bounce: { status: "bounced", field: "bounced_at" },
    dropped: { status: "failed", field: "bounced_at" },
    spamreport: { status: "bounced", field: "bounced_at" },
  };

  const mapping = statusMap[event.event];
  if (!mapping) return;

  const eventTimestamp = event.timestamp
    ? new Date(event.timestamp * 1000).toISOString()
    : new Date().toISOString();

  // Update message status + timestamp
  await admin
    .from("message")
    .update({
      status: mapping.status,
      [mapping.field]: eventTimestamp,
    })
    .eq("id", message.id);

  // Update decision_log outcome fields
  if (message.journey_enrollment_id) {
    const outcomeUpdates: Record<string, unknown> = {};

    if (event.event === "open") outcomeUpdates.outcome_opened = true;
    if (event.event === "click") {
      outcomeUpdates.outcome_opened = true;
      outcomeUpdates.outcome_clicked = true;
    }
    if (event.event === "spamreport") {
      outcomeUpdates.outcome_unsubscribed = true;
    }

    if (Object.keys(outcomeUpdates).length > 0) {
      await admin
        .from("decision_log")
        .update(outcomeUpdates)
        .eq("enrollment_id", message.journey_enrollment_id)
        .eq("action_type", "send")
        .eq("message_id", message.id);
    }
  }

  // Insert canonical event
  const canonicalEventMap: Record<string, string> = {
    delivered: "email.delivered",
    open: "email.opened",
    click: "email.clicked",
    bounce: "email.bounced",
    spamreport: "email.complained",
  };

  const canonicalEventType = canonicalEventMap[event.event];
  if (canonicalEventType && message.contact_id) {
    await admin.from("event").insert({
      tenant_id: message.tenant_id,
      contact_id: message.contact_id,
      event_type: canonicalEventType,
      event_data: {
        message_id: message.id,
        email: event.email,
        url: event.url,
      },
      source: "sendgrid",
    });
  }

  // Update contact engagement fields
  if (message.contact_id) {
    const contactUpdates: Record<string, unknown> = {};

    if (event.event === "open") {
      contactUpdates.last_email_open_at = eventTimestamp;
    }
    if (event.event === "click") {
      contactUpdates.last_email_click_at = eventTimestamp;
    }
    if (event.event === "spamreport") {
      // Permanent suppression
      contactUpdates.engagement_score = -100;
      contactUpdates.email_consent = false;
    }

    if (Object.keys(contactUpdates).length > 0) {
      await admin
        .from("contact")
        .update(contactUpdates)
        .eq("id", message.contact_id);
    }
  }
}
