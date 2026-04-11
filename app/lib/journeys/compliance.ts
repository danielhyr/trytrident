/**
 * Compliance Engine — pre-send checks.
 *
 * Every send runs through checkCompliance. Returns clear/warn/block
 * with violation details. Block = skip send + log suppression.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ComplianceStatus = "clear" | "warn" | "block";

export interface ComplianceViolation {
  code: string;
  severity: "warn" | "block";
  message: string;
}

export interface ComplianceResult {
  status: ComplianceStatus;
  violations: ComplianceViolation[];
}

export async function checkCompliance(
  admin: SupabaseClient,
  tenantId: string,
  contactId: string,
  channel: "email" | "sms" | "push",
  contentTemplateId?: string
): Promise<ComplianceResult> {
  const violations: ComplianceViolation[] = [];

  // 1. Fetch contact consent + suppression info
  const { data: contact } = await admin
    .from("contact")
    .select(
      "email_consent, sms_consent, engagement_score, lifecycle_stage"
    )
    .eq("id", contactId)
    .single();

  if (!contact) {
    violations.push({
      code: "CONTACT_NOT_FOUND",
      severity: "block",
      message: "Contact not found",
    });
    return { status: "block", violations };
  }

  // 2. Check consent for channel
  if (channel === "email" && !contact.email_consent) {
    violations.push({
      code: "NO_EMAIL_CONSENT",
      severity: "block",
      message: "Contact has not consented to email",
    });
  }

  if (channel === "sms" && !contact.sms_consent) {
    violations.push({
      code: "NO_SMS_CONSENT",
      severity: "block",
      message: "Contact has not consented to SMS",
    });
  }

  // 3. Check suppression (engagement score of -100 = permanent suppression)
  if (contact.engagement_score <= -100) {
    violations.push({
      code: "SUPPRESSED_CONTACT",
      severity: "block",
      message: "Contact is permanently suppressed (complaint or abuse)",
    });
  }

  // 4. Frequency cap check: max 3 email/week, 2 SMS/week
  const weekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { count: recentCount } = await admin
    .from("message")
    .select("*", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .eq("channel", channel)
    .gte("created_at", weekAgo)
    .in("status", ["queued", "sent", "delivered", "opened", "clicked"]);

  const maxPerWeek = channel === "email" ? 3 : channel === "sms" ? 2 : 5;
  if ((recentCount ?? 0) >= maxPerWeek) {
    violations.push({
      code: "FREQUENCY_CAP_EXCEEDED",
      severity: "block",
      message: `Contact has received ${recentCount} ${channel} messages this week (max ${maxPerWeek})`,
    });
  }

  // 5. Check content template for required elements (email only)
  if (channel === "email" && contentTemplateId) {
    const { data: template } = await admin
      .from("content_template")
      .select("body_html, body_text, body_json")
      .eq("id", contentTemplateId)
      .single();

    if (template) {
      const content = [
        template.body_html ?? "",
        template.body_text ?? "",
        typeof template.body_json === "string" ? template.body_json : JSON.stringify(template.body_json ?? ""),
      ].join(" ");

      // Check for unsubscribe link
      const hasUnsubscribe =
        content.toLowerCase().includes("unsubscribe") ||
        content.includes("{{unsubscribe_url}}");

      if (!hasUnsubscribe) {
        violations.push({
          code: "MISSING_UNSUBSCRIBE",
          severity: "warn",
          message: "Email template is missing an unsubscribe link",
        });
      }
    }
  }

  // Determine overall status
  const hasBlock = violations.some((v) => v.severity === "block");
  const hasWarn = violations.some((v) => v.severity === "warn");

  return {
    status: hasBlock ? "block" : hasWarn ? "warn" : "clear",
    violations,
  };
}
