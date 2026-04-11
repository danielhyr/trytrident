"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Play, Pause, RotateCcw } from "lucide-react";
import type { Journey, JourneyStatus } from "@/lib/journeys/types";
import { JOURNEY_STATUS_CONFIG } from "@/lib/journeys/types";

interface JourneyTopBarProps {
  journey: Journey;
  onSave: () => void;
  onActivate: () => void;
  onPause: () => void;
  onResume: () => void;
  saving?: boolean;
  dirty?: boolean;
}

export function JourneyTopBar({
  journey,
  onSave,
  onActivate,
  onPause,
  onResume,
  saving,
  dirty,
}: JourneyTopBarProps) {
  const router = useRouter();
  const [name, setName] = useState(journey.name);
  const [editing, setEditing] = useState(false);
  const config = JOURNEY_STATUS_CONFIG[journey.status];

  return (
    <div className="flex h-14 items-center justify-between border-b border-card-border bg-white px-4">
      {/* Left: back + name */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/journeys")}
          className="rounded p-1 text-text-main-muted transition-colors hover:bg-gray-100 hover:text-text-main"
        >
          <ArrowLeft size={18} />
        </button>

        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditing(false);
            }}
            className="rounded border border-card-border px-2 py-1 text-lg font-semibold text-text-main outline-none focus:border-accent"
          />
        ) : (
          <h1
            onClick={() => {
              if (journey.status === "draft" || journey.status === "paused") {
                setEditing(true);
              }
            }}
            className={`text-lg font-semibold text-text-main ${
              journey.status === "draft" || journey.status === "paused"
                ? "cursor-pointer hover:text-accent"
                : ""
            }`}
          >
            {name}
          </h1>
        )}

        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: config.color + "18",
            color: config.color,
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          {config.label}
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {dirty && (
          <span className="mr-2 text-xs text-amber-500">Unsaved changes</span>
        )}

        {(journey.status === "draft" || journey.status === "paused") && (
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md border border-card-border bg-white px-3 py-1.5 text-sm font-medium text-text-main transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
              <Save size={14} />
            )}
            Save
          </button>
        )}

        {journey.status === "active" && (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            <Pause size={14} />
            Pause
          </button>
        )}

        {journey.status === "paused" && (
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <RotateCcw size={14} />
            Resume
          </button>
        )}

        {journey.status === "draft" && (
          <button
            onClick={onActivate}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            <Play size={14} />
            Activate
          </button>
        )}
      </div>
    </div>
  );
}
