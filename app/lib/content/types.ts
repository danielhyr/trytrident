// ============================================================
// Content Studio types — shared across API, actions, and UI.
// ============================================================

export type ContentChannel = "email" | "sms" | "push";
export type TemplateStatus = "draft" | "active" | "archived";

export interface ContentTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  channel: ContentChannel;
  status: TemplateStatus;
  subject: string | null;
  preheader: string | null;
  body_json: unknown;
  body_html: string | null;
  body_text: string | null;
  push_title: string | null;
  push_image_url: string | null;
  push_click_action: string | null;
  liquid_variables: string[] | null;
  tags: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContentTemplateVersion {
  id: string;
  template_id: string;
  tenant_id: string;
  version_number: number;
  snapshot: unknown;
  change_summary: string | null;
  created_by: string;
  created_at: string;
}

export interface ContentAsset {
  id: string;
  tenant_id: string;
  name: string;
  file_path: string;
  public_url: string;
  mime_type: string;
  file_size_bytes: number | null;
  dimensions: { width: number; height: number } | null;
  tags: string[] | null;
  uploaded_by: string;
  created_at: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  channel: ContentChannel;
  status?: TemplateStatus;
  subject?: string;
  preheader?: string;
  body_json?: unknown;
  body_html?: string;
  body_text?: string;
  push_title?: string;
  push_image_url?: string;
  push_click_action?: string;
  liquid_variables?: string[];
  tags?: string[];
  created_by?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  status?: TemplateStatus;
  subject?: string;
  preheader?: string;
  body_json?: unknown;
  body_html?: string;
  body_text?: string;
  push_title?: string;
  push_image_url?: string;
  push_click_action?: string;
  liquid_variables?: string[];
  tags?: string[];
}

export interface ListTemplatesOptions {
  channel?: ContentChannel;
  status?: TemplateStatus;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface CreateAssetInput {
  name: string;
  file_path: string;
  public_url: string;
  mime_type: string;
  file_size_bytes?: number;
  dimensions?: { width: number; height: number };
  tags?: string[];
  uploaded_by?: string;
}

/** Channel display config */
export const CHANNEL_CONFIG: Record<
  ContentChannel,
  { label: string; color: string; icon: string }
> = {
  email: { label: "Email", color: "#3B82F6", icon: "Mail" },
  sms: { label: "SMS", color: "#22C55E", icon: "MessageSquare" },
  push: { label: "Push", color: "#8B5CF6", icon: "Bell" },
};

export const STATUS_CONFIG: Record<
  TemplateStatus,
  { label: string; color: string }
> = {
  draft: { label: "Draft", color: "#94A3B8" },
  active: { label: "Active", color: "#10B981" },
  archived: { label: "Archived", color: "#64748B" },
};
