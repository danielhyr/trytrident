"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChannelIcon } from "./channel-icon";
import type { ContentChannel, TemplateStatus } from "@/lib/content/types";

interface ComposerTopBarProps {
  channel: ContentChannel;
  name: string;
  saving: boolean;
  status?: TemplateStatus;
  publishing?: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onPublish?: () => void;
}

export function ComposerTopBar({
  channel,
  name,
  saving,
  status,
  publishing,
  onNameChange,
  onSave,
  onPublish,
}: ComposerTopBarProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const isPublished = status === "active";

  return (
    <div className="flex h-14 items-center justify-between border-b border-card-border bg-card px-4">
      {/* Left: back + name */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/content")}
          className="rounded p-1.5 text-text-main-muted hover:bg-gray-100 hover:text-text-main"
        >
          <ArrowLeft size={18} />
        </button>

        <ChannelIcon channel={channel} size={18} />

        {editing ? (
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditing(false);
            }}
            autoFocus
            className="border-b border-accent bg-transparent font-headline text-sm font-semibold text-text-main outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="font-headline text-sm font-semibold text-text-main hover:text-accent"
          >
            {name || "Untitled"}
          </button>
        )}
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-md border border-card-border px-4 py-1.5 text-xs font-medium text-text-main transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        {onPublish && (
          <button
            onClick={onPublish}
            disabled={publishing || saving}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              isPublished
                ? "border border-card-border text-text-main-muted hover:border-red-400 hover:text-red-500"
                : "bg-accent text-white hover:bg-accent/90"
            }`}
          >
            {publishing
              ? isPublished
                ? "Unpublishing..."
                : "Publishing..."
              : isPublished
                ? "Unpublish"
                : "Publish"}
          </button>
        )}
      </div>
    </div>
  );
}
