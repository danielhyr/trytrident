/**
 * SendGrid Sender — high-level send for journey engine.
 *
 * Handles: fetch contact → fetch template → fetch tenant →
 * render Liquid → compile MJML → send via SendGrid → insert message row.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { Liquid } from "liquidjs";
import { sendEmail } from "./client";
import type { Message } from "@/lib/journeys/types";

const liquid = new Liquid();

interface SendJourneyEmailParams {
  contactId: string;
  contentTemplateId: string;
  enrollmentId: string;
  variant?: string;
}

export async function sendJourneyEmail(
  admin: SupabaseClient,
  tenantId: string,
  params: SendJourneyEmailParams
): Promise<Message> {
  // Fetch contact
  const { data: contact } = await admin
    .from("contact")
    .select("*")
    .eq("id", params.contactId)
    .single();

  if (!contact) throw new Error("Contact not found");
  if (!contact.email) throw new Error("Contact has no email address");

  // Fetch template
  const { data: template } = await admin
    .from("content_template")
    .select("*")
    .eq("id", params.contentTemplateId)
    .single();

  if (!template) throw new Error("Content template not found");

  // Fetch tenant for sender config
  const { data: tenant } = await admin
    .from("tenant")
    .select("name, sendgrid_api_key, sender_email, sender_name")
    .eq("id", tenantId)
    .single();

  if (!tenant?.sendgrid_api_key) {
    throw new Error("SendGrid API key not configured for this tenant");
  }

  if (!tenant.sender_email) {
    throw new Error("Sender email not configured for this tenant");
  }

  // Build Liquid context
  const liquidContext = {
    contact: {
      first_name: contact.first_name ?? "",
      last_name: contact.last_name ?? "",
      email: contact.email,
      order_count: contact.total_orders ?? 0,
      total_spent: contact.total_revenue ?? 0,
      last_order_date: contact.last_order_at ?? "",
    },
    shop: {
      name: tenant.name ?? "Shop",
      url: "",
      currency: "USD",
    },
    campaign: {},
  };

  // Render subject and body with Liquid
  const subject = template.subject
    ? await liquid.parseAndRender(template.subject, liquidContext)
    : "(no subject)";

  let bodyHtml = template.body_html ?? "";
  let bodyText = template.body_text ?? "";

  if (bodyHtml) {
    bodyHtml = await liquid.parseAndRender(bodyHtml, liquidContext);
  }

  // If we have body_json (MJML source), try to compile it
  if (template.body_json && typeof template.body_json === "string") {
    try {
      const mjml = await liquid.parseAndRender(
        template.body_json,
        liquidContext
      );
      // Dynamic import to avoid bundling issues
      const mjml2html = (await import("mjml")).default;
      const { html } = mjml2html(mjml);
      bodyHtml = html;
    } catch {
      // Fall back to existing body_html
    }
  }

  if (bodyText) {
    bodyText = await liquid.parseAndRender(bodyText, liquidContext);
  }

  // Send via SendGrid
  const { messageId } = await sendEmail({
    apiKey: tenant.sendgrid_api_key,
    to: contact.email,
    from: {
      email: tenant.sender_email,
      name: tenant.sender_name ?? tenant.name,
    },
    subject,
    html: bodyHtml || undefined,
    text: bodyText || undefined,
    customArgs: {
      tenant_id: tenantId,
      enrollment_id: params.enrollmentId,
      contact_id: params.contactId,
    },
  });

  // Insert message row
  const { data: message, error } = await admin
    .from("message")
    .insert({
      tenant_id: tenantId,
      contact_id: params.contactId,
      journey_enrollment_id: params.enrollmentId,
      content_template_id: params.contentTemplateId,
      channel: "email",
      subject,
      body_html: bodyHtml || null,
      body_text: bodyText || null,
      variant: params.variant ?? null,
      status: "sent",
      provider_message_id: messageId,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save message: ${error.message}`);
  return message as Message;
}

// ============================================================
// Queue-based delivery — works with existing queued message rows
// ============================================================

const MAX_RETRIES = 3;

/**
 * Process a single queued message: fetch context, render, send, update row.
 */
export async function processQueuedMessage(
  admin: SupabaseClient,
  messageId: string
): Promise<"sent" | "failed" | "skipped"> {
  const { data: msg } = await admin
    .from("message")
    .select("*")
    .eq("id", messageId)
    .eq("status", "queued")
    .single();

  if (!msg) return "skipped";

  // SMS/Push not supported yet
  if (msg.channel !== "email") {
    await markFailed(admin, messageId, msg.retry_count, "Channel not supported yet");
    return "failed";
  }

  if (!msg.content_template_id) {
    await markFailed(admin, messageId, msg.retry_count, "No content template linked");
    return "failed";
  }

  // Fetch contact
  const { data: contact } = await admin
    .from("contact")
    .select("*")
    .eq("id", msg.contact_id)
    .single();

  if (!contact?.email) {
    await markFailed(admin, messageId, msg.retry_count, "Contact has no email address");
    return "failed";
  }

  // Fetch template
  const { data: template } = await admin
    .from("content_template")
    .select("*")
    .eq("id", msg.content_template_id)
    .single();

  if (!template) {
    await markFailed(admin, messageId, msg.retry_count, "Content template not found");
    return "failed";
  }

  // Fetch tenant config
  const { data: tenant } = await admin
    .from("tenant")
    .select("name, sendgrid_api_key, sender_email, sender_name")
    .eq("id", msg.tenant_id)
    .single();

  const apiKey = tenant?.sendgrid_api_key;
  const senderEmail = tenant?.sender_email;
  const senderName = tenant?.sender_name ?? tenant?.name ?? "Trident";

  if (!apiKey) {
    await markFailed(admin, messageId, msg.retry_count, "SendGrid API key not configured");
    return "failed";
  }
  if (!senderEmail) {
    await markFailed(admin, messageId, msg.retry_count, "Sender email not configured");
    return "failed";
  }

  // Build Liquid context
  const liquidContext = {
    contact: {
      first_name: contact.first_name ?? "",
      last_name: contact.last_name ?? "",
      email: contact.email,
      order_count: contact.total_orders ?? 0,
      total_spent: contact.total_revenue ?? 0,
      last_order_date: contact.last_order_at ?? "",
    },
    shop: {
      name: tenant?.name ?? "Shop",
      url: "",
      currency: "USD",
    },
    campaign: {},
  };

  // Render subject and body
  try {
    const subject = template.subject
      ? await liquid.parseAndRender(template.subject, liquidContext)
      : "(no subject)";

    let bodyHtml = template.body_html ?? "";
    let bodyText = template.body_text ?? "";

    if (bodyHtml) {
      bodyHtml = await liquid.parseAndRender(bodyHtml, liquidContext);
    }

    // MJML source → compile to HTML
    if (template.body_json && typeof template.body_json === "string") {
      try {
        const mjml = await liquid.parseAndRender(template.body_json, liquidContext);
        const mjml2html = (await import("mjml")).default;
        const { html } = mjml2html(mjml);
        bodyHtml = html;
      } catch {
        // Fall back to existing body_html
      }
    }

    if (bodyText) {
      bodyText = await liquid.parseAndRender(bodyText, liquidContext);
    }

    // Send via SendGrid
    const { messageId: providerMessageId } = await sendEmail({
      apiKey,
      to: contact.email,
      from: { email: senderEmail, name: senderName },
      subject,
      html: bodyHtml || undefined,
      text: bodyText || undefined,
      customArgs: {
        tenant_id: msg.tenant_id,
        enrollment_id: msg.journey_enrollment_id ?? "",
        contact_id: msg.contact_id,
        message_id: messageId,
      },
    });

    // Success — update message row
    await admin
      .from("message")
      .update({
        status: "sent",
        provider_message_id: providerMessageId,
        subject,
        body_html: bodyHtml || null,
        body_text: bodyText || null,
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", messageId);

    return "sent";
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown send error";
    const retryCount = (msg.retry_count ?? 0) + 1;

    if (retryCount >= MAX_RETRIES) {
      await markFailed(admin, messageId, retryCount, errorMsg);
      return "failed";
    }

    // Leave as queued for retry on next cron cycle
    await admin
      .from("message")
      .update({ retry_count: retryCount, error_message: errorMsg })
      .eq("id", messageId);

    return "skipped";
  }
}

async function markFailed(
  admin: SupabaseClient,
  messageId: string,
  retryCount: number,
  errorMessage: string
): Promise<void> {
  await admin
    .from("message")
    .update({
      status: "failed",
      retry_count: retryCount,
      error_message: errorMessage,
    })
    .eq("id", messageId);
}

/**
 * Batch-process queued messages. Called by the cron endpoint.
 */
export async function processQueuedMessages(
  admin: SupabaseClient,
  batchSize = 20
): Promise<{ processed: number; sent: number; failed: number; errors: number }> {
  const stats = { processed: 0, sent: 0, failed: 0, errors: 0 };

  const { data: messages } = await admin
    .from("message")
    .select("id")
    .eq("status", "queued")
    .lt("retry_count", MAX_RETRIES)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (!messages || messages.length === 0) return stats;

  for (const msg of messages) {
    try {
      const result = await processQueuedMessage(admin, msg.id);
      stats.processed++;
      if (result === "sent") stats.sent++;
      if (result === "failed") stats.failed++;
    } catch (err) {
      stats.errors++;
      console.error(`Error processing message ${msg.id}:`, err);
    }
  }

  return stats;
}
