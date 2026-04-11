"use client";

import { ChannelIcon } from "./channel-icon";
import { StatusBadge } from "./status-badge";
import { Copy, Trash2, Archive } from "lucide-react";
import type { ContentTemplate } from "@/lib/content/types";

interface TemplateCardProps {
  template: ContentTemplate;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: TemplateCardProps) {
  const preview = getPreviewText(template);
  const timeAgo = formatTimeAgo(template.updated_at);

  return (
    <div
      className="group cursor-pointer rounded-lg border border-card-border bg-card p-4 transition-all hover:border-card-border-focus hover:shadow-sm"
      onClick={() => onEdit(template.id)}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <ChannelIcon channel={template.channel} />
          <StatusBadge status={template.status} />
        </div>
        <div
          className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onDuplicate(template.id)}
            className="rounded p-1 text-text-main-muted hover:bg-gray-100 hover:text-text-main"
            title="Duplicate"
          >
            <Copy size={14} />
          </button>
          {template.status !== "archived" && (
            <button
              onClick={() => onArchive(template.id)}
              className="rounded p-1 text-text-main-muted hover:bg-gray-100 hover:text-text-main"
              title="Archive"
            >
              <Archive size={14} />
            </button>
          )}
          <button
            onClick={() => onDelete(template.id)}
            className="rounded p-1 text-text-main-muted hover:bg-red-50 hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h3 className="mb-1 font-headline text-sm font-semibold text-text-main truncate">
        {template.name}
      </h3>

      {preview && (
        <p className="mb-3 text-xs text-text-main-muted line-clamp-2">
          {preview}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-text-main-muted">
        <span>{timeAgo}</span>
        {template.liquid_variables && template.liquid_variables.length > 0 && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-data text-[10px]">
            {template.liquid_variables.length} var
            {template.liquid_variables.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function getPreviewText(template: ContentTemplate): string {
  if (template.channel === "email" && template.subject) {
    return template.subject;
  }
  if (template.body_text) {
    return template.body_text;
  }
  if (template.push_title) {
    return template.push_title;
  }
  return template.description ?? "";
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
