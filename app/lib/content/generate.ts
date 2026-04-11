/**
 * AI content generation — uses Gemini Flash to generate template content.
 *
 * Generates SMS, push, and email content with Liquid personalization.
 */

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as contentAPI from "@/lib/api/content";
import type { ContentTemplate } from "./types";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

interface GenerateOptions {
  purpose: string;
  tone?: string;
  audience?: string;
}

export async function generateSmsContent(
  admin: SupabaseClient,
  tenantId: string,
  options: GenerateOptions
): Promise<ContentTemplate> {
  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: z.object({
      name: z.string().describe("Template name"),
      body: z
        .string()
        .describe(
          "SMS message body, 160 chars max. Must include Liquid variables like {{ contact.first_name }}."
        ),
    }),
    prompt: `Generate an SMS marketing message for an e-commerce store.

Purpose: ${options.purpose}
Tone: ${options.tone ?? "friendly and concise"}
Audience: ${options.audience ?? "existing customers"}

Available Liquid variables:
- {{ contact.first_name }}, {{ contact.last_name }}
- {{ shop.name }}, {{ shop.url }}
- {{ campaign.coupon_code }}, {{ campaign.discount_percent }}

Requirements:
- Keep under 160 characters if possible
- Include at least one personalization variable
- Include a clear call to action
- Do NOT include "Reply STOP to unsubscribe" (added automatically)`,
  });

  return contentAPI.createTemplate(admin, tenantId, {
    name: object.name,
    channel: "sms",
    body_text: object.body,
    body_json: { text: object.body },
    created_by: "ai",
  });
}

export async function generatePushContent(
  admin: SupabaseClient,
  tenantId: string,
  options: GenerateOptions
): Promise<ContentTemplate> {
  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: z.object({
      name: z.string().describe("Template name"),
      title: z.string().describe("Push notification title, max 50 chars"),
      body: z.string().describe("Push notification body, max 150 chars"),
    }),
    prompt: `Generate a push notification for an e-commerce store.

Purpose: ${options.purpose}
Tone: ${options.tone ?? "attention-grabbing but not spammy"}

Available Liquid variables:
- {{ contact.first_name }}
- {{ shop.name }}
- {{ campaign.coupon_code }}, {{ campaign.discount_percent }}

Requirements:
- Title: max 50 characters, compelling
- Body: max 150 characters, clear CTA
- Include personalization where natural`,
  });

  return contentAPI.createTemplate(admin, tenantId, {
    name: object.name,
    channel: "push",
    push_title: object.title,
    body_text: object.body,
    body_json: { title: object.title, body: object.body },
    created_by: "ai",
  });
}

export async function generateEmailContent(
  admin: SupabaseClient,
  tenantId: string,
  options: GenerateOptions
): Promise<ContentTemplate> {
  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: z.object({
      name: z.string().describe("Template name"),
      subject: z.string().describe("Email subject line"),
      preheader: z.string().describe("Email preheader/preview text"),
      bodyText: z
        .string()
        .describe(
          "Email body as paragraphs of text with Liquid variables. Will be wrapped in MJML."
        ),
    }),
    prompt: `Generate an email for an e-commerce marketing campaign.

Purpose: ${options.purpose}
Tone: ${options.tone ?? "professional and engaging"}
Audience: ${options.audience ?? "existing customers"}

Available Liquid variables:
- {{ contact.first_name }}, {{ contact.last_name }}
- {{ contact.total_spent | money }}, {{ contact.order_count }}
- {{ shop.name }}, {{ shop.url }}
- {{ campaign.coupon_code }}, {{ campaign.discount_percent }}%

Requirements:
- Subject line: compelling, include personalization
- Preheader: extends subject line, adds context
- Body: 2-4 paragraphs, clear CTA, use Liquid variables for personalization
- Use {{ contact.first_name | default: "there" }} for safe greeting`,
  });

  // Wrap the generated body text in MJML
  const mjml = `<mjml>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="20px 0">
      <mj-column>
        <mj-text align="center" font-size="24px" font-weight="bold" color="#1E293B">
          {{ shop.name }}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff">
      <mj-column>
        <mj-text font-size="16px" color="#374151" line-height="1.6">
          ${object.bodyText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff">
      <mj-column>
        <mj-button background-color="#0ACDBC" color="#ffffff" font-size="16px" border-radius="6px" href="{{ shop.url }}">
          Shop Now
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section background-color="#f8fafc" padding="20px 0">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#94A3B8">
          {{ shop.name }} · 123 Main St, Anytown, US 12345
        </mj-text>
        <mj-text align="center" font-size="12px" color="#94A3B8">
          <a href="#" style="color: #64748B;">Unsubscribe</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

  return contentAPI.createTemplate(admin, tenantId, {
    name: object.name,
    channel: "email",
    subject: object.subject,
    preheader: object.preheader,
    body_json: mjml,
    body_text: object.bodyText,
    created_by: "ai",
  });
}
