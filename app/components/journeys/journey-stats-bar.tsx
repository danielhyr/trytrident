"use client";

import type { JourneyStats } from "@/lib/journeys/types";

interface JourneyStatsBarProps {
  stats: JourneyStats;
}

export function JourneyStatsBar({ stats }: JourneyStatsBarProps) {
  return (
    <div className="flex items-center gap-6 border-b border-card-border bg-white px-4 py-2">
      <Stat label="Enrolled" value={stats.enrolled.toLocaleString()} />
      <Stat label="Active" value={stats.active.toLocaleString()} />
      <Stat label="Completed" value={stats.completed.toLocaleString()} />
      <Stat label="Exited" value={stats.exited.toLocaleString()} />
      <Stat label="Conversion" value={`${stats.conversion_rate}%`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-text-main-muted">{label}:</span>
      <span className="font-data text-sm font-medium text-text-main">
        {value}
      </span>
    </div>
  );
}
