"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreVertical,
  Copy,
  Pause,
  Play,
  Archive,
  Trash2,
  Pencil,
} from "lucide-react";
import type { Journey, JourneyStatus, JourneyStats } from "@/lib/journeys/types";
import { JOURNEY_STATUS_CONFIG } from "@/lib/journeys/types";
import * as journeyActions from "@/app/actions/journeys";

type JourneyWithStats = Journey & { stats: JourneyStats };

interface JourneyListProps {
  initialJourneys: JourneyWithStats[];
  initialTotal: number;
}

export function JourneyList({
  initialJourneys,
  initialTotal,
}: JourneyListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [journeys, setJourneys] = useState(initialJourneys);
  const [total, setTotal] = useState(initialTotal);
  const [statusFilter, setStatusFilter] = useState<JourneyStatus | null>(null);
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const reload = (status: JourneyStatus | null, searchTerm: string) => {
    startTransition(async () => {
      const result = await journeyActions.fetchJourneys({
        status: status ?? undefined,
        search: searchTerm || undefined,
      });
      if ("error" in result) return;

      // Fetch stats for each journey
      const withStats = await Promise.all(
        result.journeys.map(async (j) => {
          const statsResult = await journeyActions.fetchJourneyStats(j.id);
          const stats =
            "stats" in statsResult
              ? statsResult.stats
              : { enrolled: 0, active: 0, completed: 0, exited: 0, conversion_rate: 0 };
          return { ...j, stats };
        })
      );

      setJourneys(withStats);
      setTotal(result.total);
    });
  };

  const handleStatusFilter = (status: JourneyStatus | null) => {
    setStatusFilter(status);
    reload(status, search);
  };

  const handleSearch = (term: string) => {
    setSearch(term);
    reload(statusFilter, term);
  };

  const handleDuplicate = async (id: string) => {
    const result = await journeyActions.duplicateJourney(id);
    if ("error" in result) return;
    reload(statusFilter, search);
  };

  const handlePause = async (id: string) => {
    const result = await journeyActions.pauseJourney(id);
    if ("error" in result) return;
    reload(statusFilter, search);
  };

  const handleResume = async (id: string) => {
    const result = await journeyActions.resumeJourney(id);
    if ("error" in result) return;
    reload(statusFilter, search);
  };

  const handleArchive = async (id: string) => {
    const result = await journeyActions.archiveJourney(id);
    if ("error" in result) return;
    reload(statusFilter, search);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this journey? This cannot be undone.")) return;
    const result = await journeyActions.deleteJourney(id);
    if ("error" in result) return;
    reload(statusFilter, search);
  };

  const statusCounts = {
    all: initialTotal,
    active: initialJourneys.filter((j) => j.status === "active").length,
    paused: initialJourneys.filter((j) => j.status === "paused").length,
    draft: initialJourneys.filter((j) => j.status === "draft").length,
    archived: initialJourneys.filter((j) => j.status === "archived").length,
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-text-main">
          Journeys
        </h1>
        <button
          onClick={() => router.push("/journeys/new")}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          <Plus size={16} />
          New Journey
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2">
        <FilterPill
          active={statusFilter === null}
          onClick={() => handleStatusFilter(null)}
          label={`All (${statusCounts.all})`}
        />
        <FilterPill
          active={statusFilter === "active"}
          onClick={() => handleStatusFilter("active")}
          label={`Active (${statusCounts.active})`}
          color={JOURNEY_STATUS_CONFIG.active.color}
        />
        <FilterPill
          active={statusFilter === "paused"}
          onClick={() => handleStatusFilter("paused")}
          label={`Paused (${statusCounts.paused})`}
          color={JOURNEY_STATUS_CONFIG.paused.color}
        />
        <FilterPill
          active={statusFilter === "draft"}
          onClick={() => handleStatusFilter("draft")}
          label={`Draft (${statusCounts.draft})`}
          color={JOURNEY_STATUS_CONFIG.draft.color}
        />
        <FilterPill
          active={statusFilter === "archived"}
          onClick={() => handleStatusFilter("archived")}
          label={`Archived (${statusCounts.archived})`}
          color={JOURNEY_STATUS_CONFIG.archived.color}
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-md border border-card-border bg-card px-3 py-2">
        <Search size={16} className="text-text-main-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search journeys..."
          className="flex-1 bg-transparent text-sm text-text-main outline-none placeholder:text-text-main-muted"
        />
        {isPending && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        )}
      </div>

      {/* Table */}
      {journeys.length > 0 ? (
        <div className="overflow-visible rounded-lg border border-card-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-main-muted">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-main-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-main-muted">
                  Enrolled
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-main-muted">
                  Conversion
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-main-muted">
                  Updated
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {journeys.map((j) => (
                <tr
                  key={j.id}
                  className="group cursor-pointer border-b border-card-border last:border-0 hover:bg-gray-50"
                  onClick={() => router.push(`/journeys/${j.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-text-main">
                      {j.name}
                    </p>
                    {j.description && (
                      <p className="mt-0.5 text-xs text-text-main-muted line-clamp-1">
                        {j.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={j.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-data text-sm text-text-main">
                    {j.stats.enrolled.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-data text-sm text-text-main">
                    {j.stats.conversion_rate}%
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-text-main-muted">
                    {formatRelativeDate(j.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === j.id ? null : j.id);
                        }}
                        className="rounded p-1 opacity-0 transition-opacity hover:bg-gray-100 group-hover:opacity-100"
                      >
                        <MoreVertical size={16} className="text-text-main-muted" />
                      </button>
                      {menuOpenId === j.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(null);
                            }}
                          />
                          <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-card-border bg-card py-1 shadow-lg">
                            <MenuButton
                              icon={<Pencil size={14} />}
                              label="Edit"
                              onClick={() => {
                                setMenuOpenId(null);
                                router.push(`/journeys/${j.id}`);
                              }}
                            />
                            <MenuButton
                              icon={<Copy size={14} />}
                              label="Duplicate"
                              onClick={() => {
                                setMenuOpenId(null);
                                handleDuplicate(j.id);
                              }}
                            />
                            {j.status === "active" && (
                              <MenuButton
                                icon={<Pause size={14} />}
                                label="Pause"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  handlePause(j.id);
                                }}
                              />
                            )}
                            {j.status === "paused" && (
                              <MenuButton
                                icon={<Play size={14} />}
                                label="Resume"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  handleResume(j.id);
                                }}
                              />
                            )}
                            {j.status !== "archived" && (
                              <MenuButton
                                icon={<Archive size={14} />}
                                label="Archive"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  handleArchive(j.id);
                                }}
                              />
                            )}
                            {(j.status === "draft" || j.status === "archived") && (
                              <>
                                <div className="my-1 border-t border-card-border" />
                                <MenuButton
                                  icon={<Trash2 size={14} />}
                                  label="Delete"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    handleDelete(j.id);
                                  }}
                                  destructive
                                />
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="font-headline text-lg font-semibold text-text-main">
            {search || statusFilter ? "No journeys match your filters" : "No journeys yet"}
          </p>
          <p className="text-sm text-text-main-muted">
            {search || statusFilter
              ? "Try adjusting your filters."
              : "Ask me to set one up, or click New Journey to start."}
          </p>
        </div>
      )}

      {/* Footer count */}
      {journeys.length > 0 && (
        <p className="text-xs text-text-main-muted">
          Showing {journeys.length} of {total} journey
          {total !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: JourneyStatus }) {
  const config = JOURNEY_STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-transparent bg-white/70 text-text-main-muted hover:border-card-border hover:bg-white hover:text-text-main"
      }`}
      style={
        active && color
          ? { backgroundColor: color + "18", color }
          : undefined
      }
    >
      {label}
    </button>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
        destructive
          ? "text-red-500 hover:bg-red-50"
          : "text-text-main hover:bg-gray-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
