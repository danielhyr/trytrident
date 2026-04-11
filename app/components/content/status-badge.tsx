"use client";

import type { TemplateStatus } from "@/lib/content/types";
import { STATUS_CONFIG } from "@/lib/content/types";

interface StatusBadgeProps {
  status: TemplateStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: config.color + "18",
        color: config.color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
