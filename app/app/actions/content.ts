"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthContext, isError } from "@/lib/auth/context";
import * as contentAPI from "@/lib/api/content";
import type {
  ContentTemplate,
  ContentAsset,
  CreateTemplateInput,
  UpdateTemplateInput,
  ListTemplatesOptions,
  CreateAssetInput,
} from "@/lib/content/types";

export async function createTemplate(
  input: CreateTemplateInput
): Promise<{ template: ContentTemplate } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const template = await contentAPI.createTemplate(
      ctx.admin,
      ctx.tenantId,
      input
    );
    revalidatePath("/content");
    return { template };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create template",
    };
  }
}

export async function updateTemplate(
  templateId: string,
  input: UpdateTemplateInput
): Promise<{ template: ContentTemplate } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const template = await contentAPI.updateTemplate(
      ctx.admin,
      ctx.tenantId,
      templateId,
      input
    );
    revalidatePath("/content");
    return { template };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update template",
    };
  }
}

export async function duplicateTemplate(
  templateId: string
): Promise<{ template: ContentTemplate } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const template = await contentAPI.duplicateTemplate(
      ctx.admin,
      ctx.tenantId,
      templateId
    );
    revalidatePath("/content");
    return { template };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to duplicate template",
    };
  }
}

export async function archiveTemplate(
  templateId: string
): Promise<{ template: ContentTemplate } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const template = await contentAPI.archiveTemplate(
      ctx.admin,
      ctx.tenantId,
      templateId
    );
    revalidatePath("/content");
    return { template };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to archive template",
    };
  }
}

export async function deleteTemplate(
  templateId: string
): Promise<{ success: true } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    await contentAPI.deleteTemplate(ctx.admin, ctx.tenantId, templateId);
    revalidatePath("/content");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete template",
    };
  }
}

export async function fetchTemplates(
  options?: ListTemplatesOptions
): Promise<
  { templates: ContentTemplate[]; total: number } | { error: string }
> {
  const ctx = await resolveAuthContext();
  if (isError(ctx)) return ctx;

  try {
    return await contentAPI.listTemplates(ctx.admin, ctx.tenantId, options);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to fetch templates",
    };
  }
}

export async function fetchTemplate(
  templateId: string
): Promise<{ template: ContentTemplate } | { error: string }> {
  const ctx = await resolveAuthContext();
  if (isError(ctx)) return ctx;

  try {
    const template = await contentAPI.getTemplate(
      ctx.admin,
      ctx.tenantId,
      templateId
    );
    return { template };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Template not found",
    };
  }
}

export async function createAsset(
  input: CreateAssetInput
): Promise<{ asset: ContentAsset } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const asset = await contentAPI.createAsset(ctx.admin, ctx.tenantId, input);
    revalidatePath("/content");
    return { asset };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create asset",
    };
  }
}

export async function deleteAsset(
  assetId: string
): Promise<{ success: true } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    await contentAPI.deleteAsset(ctx.admin, ctx.tenantId, assetId);
    revalidatePath("/content");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete asset",
    };
  }
}
