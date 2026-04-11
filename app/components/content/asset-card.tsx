"use client";

import { Trash2, Copy, ImageIcon } from "lucide-react";
import type { ContentAsset } from "@/lib/content/types";

interface AssetCardProps {
  asset: ContentAsset;
  onCopyUrl: (url: string) => void;
  onDelete: (id: string) => void;
}

export function AssetCard({ asset, onCopyUrl, onDelete }: AssetCardProps) {
  const timeAgo = formatTimeAgo(asset.created_at);

  return (
    <div className="group rounded-lg border border-card-border bg-card transition-all hover:border-card-border-focus hover:shadow-sm">
      {/* Image preview */}
      <div className="flex h-36 items-center justify-center overflow-hidden rounded-t-lg bg-gray-50">
        {asset.mime_type.startsWith("image/") ? (
          <img
            src={asset.public_url}
            alt={asset.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon size={32} className="text-text-main-muted" />
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="mb-1 flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <ImageIcon size={12} className="text-text-main-muted" />
            <span className="text-[10px] font-medium text-text-main-muted">
              Image
            </span>
          </div>
          <div
            className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <button
              onClick={() => onCopyUrl(asset.public_url)}
              className="rounded p-1 text-text-main-muted hover:bg-gray-100 hover:text-text-main"
              title="Copy URL"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => onDelete(asset.id)}
              className="rounded p-1 text-text-main-muted hover:bg-red-50 hover:text-red-500"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <h3 className="mb-1 font-headline text-sm font-semibold text-text-main truncate">
          {asset.name}
        </h3>

        <div className="flex items-center justify-between text-xs text-text-main-muted">
          <span>{timeAgo}</span>
          {asset.file_size_bytes && (
            <span className="font-data text-[10px]">
              {formatSize(asset.file_size_bytes)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
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
