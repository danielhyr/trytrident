/**
 * Content API — business logic functions.
 *
 * Pure functions taking (admin, tenantId, ...) — no cookies, no Next.js coupling.
 * Called by server actions (UI) and chat tools (agent).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentTemplate,
  ContentAsset,
  CreateTemplateInput,
  UpdateTemplateInput,
  ListTemplatesOptions,
  CreateAssetInput,
} from "@/lib/content/types";

// ============================================================
// Templates
// ============================================================

export async function listTemplates(
  admin: SupabaseClient,
  tenantId: string,
  options?: ListTemplatesOptions
): Promise<{ templates: ContentTemplate[]; total: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  // Count query
  let countQuery = admin
    .from("content_template")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (options?.channel) countQuery = countQuery.eq("channel", options.channel);
  if (options?.status) countQuery = countQuery.eq("status", options.status);
  if (options?.search) {
    countQuery = countQuery.or(
      `name.ilike.%${options.search}%,description.ilike.%${options.search}%`
    );
  }
  if (options?.tags && options.tags.length > 0) {
    countQuery = countQuery.overlaps("tags", options.tags);
  }

  const { count } = await countQuery;

  // Data query
  let dataQuery = admin
    .from("content_template")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.channel) dataQuery = dataQuery.eq("channel", options.channel);
  if (options?.status) dataQuery = dataQuery.eq("status", options.status);
  if (options?.search) {
    dataQuery = dataQuery.or(
      `name.ilike.%${options.search}%,description.ilike.%${options.search}%`
    );
  }
  if (options?.tags && options.tags.length > 0) {
    dataQuery = dataQuery.overlaps("tags", options.tags);
  }

  const { data, error } = await dataQuery;
  if (error) throw new Error(`Failed to list templates: ${error.message}`);

  return {
    templates: (data ?? []) as ContentTemplate[],
    total: count ?? 0,
  };
}

export async function getTemplate(
  admin: SupabaseClient,
  tenantId: string,
  templateId: string
): Promise<ContentTemplate> {
  const { data, error } = await admin
    .from("content_template")
    .select("*")
    .eq("id", templateId)
    .eq("tenant_id", tenantId)
    .single();

  if (error) throw new Error(`Template not found: ${error.message}`);
  return data as ContentTemplate;
}

export async function createTemplate(
  admin: SupabaseClient,
  tenantId: string,
  input: CreateTemplateInput
): Promise<ContentTemplate> {
  // Extract liquid variables from body text
  const variables = extractLiquidVariablesFromInput(input);

  const { data, error } = await admin
    .from("content_template")
    .insert({
      tenant_id: tenantId,
      name: input.name,
      description: input.description ?? null,
      channel: input.channel,
      status: input.status ?? "draft",
      subject: input.subject ?? null,
      preheader: input.preheader ?? null,
      body_json: input.body_json ?? null,
      body_html: input.body_html ?? null,
      body_text: input.body_text ?? null,
      push_title: input.push_title ?? null,
      push_image_url: input.push_image_url ?? null,
      push_click_action: input.push_click_action ?? null,
      liquid_variables: input.liquid_variables ?? variables,
      tags: input.tags ?? null,
      created_by: input.created_by ?? "user",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create template: ${error.message}`);
  return data as ContentTemplate;
}

export async function updateTemplate(
  admin: SupabaseClient,
  tenantId: string,
  templateId: string,
  input: UpdateTemplateInput
): Promise<ContentTemplate> {
  // Check if body changed — if so, create a version snapshot first
  const bodyChanged =
    input.body_json !== undefined ||
    input.body_html !== undefined ||
    input.body_text !== undefined;

  if (bodyChanged) {
    await createVersionSnapshot(admin, tenantId, templateId);
  }

  // Re-extract liquid variables if body changed
  const variables = bodyChanged
    ? extractLiquidVariablesFromInput(input)
    : undefined;

  const updatePayload: Record<string, unknown> = {};
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.description !== undefined)
    updatePayload.description = input.description;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.subject !== undefined) updatePayload.subject = input.subject;
  if (input.preheader !== undefined) updatePayload.preheader = input.preheader;
  if (input.body_json !== undefined) updatePayload.body_json = input.body_json;
  if (input.body_html !== undefined) updatePayload.body_html = input.body_html;
  if (input.body_text !== undefined) updatePayload.body_text = input.body_text;
  if (input.push_title !== undefined)
    updatePayload.push_title = input.push_title;
  if (input.push_image_url !== undefined)
    updatePayload.push_image_url = input.push_image_url;
  if (input.push_click_action !== undefined)
    updatePayload.push_click_action = input.push_click_action;
  if (input.liquid_variables !== undefined)
    updatePayload.liquid_variables = input.liquid_variables;
  if (variables) updatePayload.liquid_variables = variables;
  if (input.tags !== undefined) updatePayload.tags = input.tags;

  const { data, error } = await admin
    .from("content_template")
    .update(updatePayload)
    .eq("id", templateId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update template: ${error.message}`);
  return data as ContentTemplate;
}

export async function duplicateTemplate(
  admin: SupabaseClient,
  tenantId: string,
  templateId: string
): Promise<ContentTemplate> {
  const original = await getTemplate(admin, tenantId, templateId);

  return createTemplate(admin, tenantId, {
    name: `${original.name} (Copy)`,
    description: original.description ?? undefined,
    channel: original.channel,
    status: "draft",
    subject: original.subject ?? undefined,
    preheader: original.preheader ?? undefined,
    body_json: original.body_json ?? undefined,
    body_html: original.body_html ?? undefined,
    body_text: original.body_text ?? undefined,
    push_title: original.push_title ?? undefined,
    push_image_url: original.push_image_url ?? undefined,
    push_click_action: original.push_click_action ?? undefined,
    liquid_variables: original.liquid_variables ?? undefined,
    tags: original.tags ?? undefined,
  });
}

export async function archiveTemplate(
  admin: SupabaseClient,
  tenantId: string,
  templateId: string
): Promise<ContentTemplate> {
  return updateTemplate(admin, tenantId, templateId, { status: "archived" });
}

export async function deleteTemplate(
  admin: SupabaseClient,
  tenantId: string,
  templateId: string
): Promise<void> {
  const { error } = await admin
    .from("content_template")
    .delete()
    .eq("id", templateId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(`Failed to delete template: ${error.message}`);
}

// ============================================================
// Assets
// ============================================================

export async function listAssets(
  admin: SupabaseClient,
  tenantId: string,
  options?: { search?: string; limit?: number }
): Promise<ContentAsset[]> {
  const limit = options?.limit ?? 50;

  let query = admin
    .from("content_asset")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list assets: ${error.message}`);
  return (data ?? []) as ContentAsset[];
}

export async function createAsset(
  admin: SupabaseClient,
  tenantId: string,
  input: CreateAssetInput
): Promise<ContentAsset> {
  const { data, error } = await admin
    .from("content_asset")
    .insert({
      tenant_id: tenantId,
      name: input.name,
      file_path: input.file_path,
      public_url: input.public_url,
      mime_type: input.mime_type,
      file_size_bytes: input.file_size_bytes ?? null,
      dimensions: input.dimensions ?? null,
      tags: input.tags ?? null,
      uploaded_by: input.uploaded_by ?? "user",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create asset: ${error.message}`);
  return data as ContentAsset;
}

export async function deleteAsset(
  admin: SupabaseClient,
  tenantId: string,
  assetId: string
): Promise<void> {
  // Get the asset first to know the storage path
  const { data: asset } = await admin
    .from("content_asset")
    .select("file_path")
    .eq("id", assetId)
    .eq("tenant_id", tenantId)
    .single();

  // Delete from DB
  const { error } = await admin
    .from("content_asset")
    .delete()
    .eq("id", assetId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(`Failed to delete asset: ${error.message}`);

  // Delete from Storage (best-effort — don't fail if storage delete fails)
  if (asset?.file_path) {
    await admin.storage.from("content-assets").remove([asset.file_path]);
  }
}

// ============================================================
// Helpers
// ============================================================

/** Create a version snapshot of the current template state */
async function createVersionSnapshot(
  admin: SupabaseClient,
  tenantId: string,
  templateId: string
): Promise<void> {
  // Get current template
  const current = await getTemplate(admin, tenantId, templateId);

  // Get latest version number
  const { data: versions } = await admin
    .from("content_template_version")
    .select("version_number")
    .eq("template_id", templateId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersion = versions && versions.length > 0
    ? (versions[0].version_number as number) + 1
    : 1;

  await admin.from("content_template_version").insert({
    template_id: templateId,
    tenant_id: tenantId,
    version_number: nextVersion,
    snapshot: {
      subject: current.subject,
      preheader: current.preheader,
      body_json: current.body_json,
      body_html: current.body_html,
      body_text: current.body_text,
      push_title: current.push_title,
      push_image_url: current.push_image_url,
      push_click_action: current.push_click_action,
      liquid_variables: current.liquid_variables,
    },
    change_summary: `Version ${nextVersion}`,
    created_by: "user",
  });
}

/** Extract Liquid variable names from template content */
function extractLiquidVariablesFromInput(
  input: Partial<CreateTemplateInput & UpdateTemplateInput>
): string[] {
  const sources: string[] = [];

  if (typeof input.body_text === "string") sources.push(input.body_text);
  if (typeof input.body_html === "string") sources.push(input.body_html);
  if (typeof input.subject === "string") sources.push(input.subject);
  if (typeof input.preheader === "string") sources.push(input.preheader);
  if (typeof input.push_title === "string") sources.push(input.push_title);
  if (typeof input.body_json === "string") sources.push(input.body_json);
  if (typeof input.body_json === "object" && input.body_json !== null) {
    sources.push(JSON.stringify(input.body_json));
  }

  const combined = sources.join(" ");
  const matches = combined.match(/\{\{\s*([a-zA-Z_][\w.]*)\s*\}\}/g);
  if (!matches) return [];

  const vars = new Set<string>();
  for (const match of matches) {
    const varName = match.replace(/\{\{\s*/, "").replace(/\s*\}\}/, "");
    vars.add(varName);
  }
  return Array.from(vars).sort();
}
