/**
 * Preview rendering service.
 *
 * Renders Liquid templates with sample data for live preview.
 * MJML compilation is done client-side only (via mjml-browser).
 */

import { renderLiquid } from "@/lib/liquid/engine";
import { SAMPLE_CONTEXT } from "@/lib/liquid/contact-context";

export async function previewSms(body: string): Promise<string> {
  if (!body) return "";
  return renderLiquid(
    body,
    SAMPLE_CONTEXT as unknown as Record<string, unknown>
  );
}

export async function previewPush(input: {
  title: string;
  body: string;
}): Promise<{ title: string; body: string }> {
  const ctx = SAMPLE_CONTEXT as unknown as Record<string, unknown>;
  const [title, body] = await Promise.all([
    input.title ? renderLiquid(input.title, ctx) : Promise.resolve(""),
    input.body ? renderLiquid(input.body, ctx) : Promise.resolve(""),
  ]);
  return { title, body };
}

export async function previewEmail(input: {
  subject: string;
  preheader: string;
  bodyHtml: string;
}): Promise<{ subject: string; preheader: string; html: string }> {
  const ctx = SAMPLE_CONTEXT as unknown as Record<string, unknown>;

  // Render Liquid in all fields (MJML → HTML done client-side before calling this)
  const [subject, preheader, html] = await Promise.all([
    input.subject ? renderLiquid(input.subject, ctx) : Promise.resolve(""),
    input.preheader ? renderLiquid(input.preheader, ctx) : Promise.resolve(""),
    input.bodyHtml ? renderLiquid(input.bodyHtml, ctx) : Promise.resolve(""),
  ]);

  return { subject, preheader, html };
}
