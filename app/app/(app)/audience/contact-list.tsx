"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { fetchContacts } from "@/app/actions/segments";
import type { ContactListResult } from "@/lib/api/segments";

interface ContactListProps {
  initialContacts: ContactListResult["contacts"];
  initialTotal: number;
  lifecycleCounts: Record<string, number>;
}

const STAGES = [
  { key: "all", label: "All" },
  { key: "prospect", label: "Prospect" },
  { key: "active", label: "Active" },
  { key: "at_risk", label: "At Risk" },
  { key: "lapsed", label: "Lapsed" },
  { key: "vip", label: "VIP" },
] as const;

const STAGE_COLORS: Record<string, string> = {
  prospect: "bg-gray-200 text-text-main-muted",
  active: "bg-success/15 text-success",
  at_risk: "bg-warning/15 text-warning",
  lapsed: "bg-danger/15 text-danger",
  vip: "bg-accent/15 text-accent",
};

const PAGE_SIZE = 50;

export function ContactList({
  initialContacts,
  initialTotal,
  lifecycleCounts,
}: ContactListProps) {
  const [contacts, setContacts] = useState(initialContacts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const loadContacts = useCallback(
    async (opts: {
      page: number;
      search: string;
      stage: string | null;
      sortBy: string;
      sortAsc: boolean;
    }) => {
      setLoading(true);
      const result = await fetchContacts({
        limit: PAGE_SIZE,
        offset: opts.page * PAGE_SIZE,
        search: opts.search || undefined,
        lifecycleStage: opts.stage ?? undefined,
        sortBy: opts.sortBy,
        sortAsc: opts.sortAsc,
      });
      if ("result" in result) {
        setContacts(result.result.contacts);
        setTotal(result.result.total);
      }
      setLoading(false);
    },
    []
  );

  function handleFilterChange(stage: string | null) {
    setStageFilter(stage);
    setPage(0);
    loadContacts({ page: 0, search, stage, sortBy, sortAsc });
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
    loadContacts({ page: 0, search: value, stage: stageFilter, sortBy, sortAsc });
  }

  function handleSort(column: string) {
    const newAsc = sortBy === column ? !sortAsc : false;
    setSortBy(column);
    setSortAsc(newAsc);
    setPage(0);
    loadContacts({ page: 0, search, stage: stageFilter, sortBy: column, sortAsc: newAsc });
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    loadContacts({ page: newPage, search, stage: stageFilter, sortBy, sortAsc });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Lifecycle distribution bar */}
      <div className="flex flex-wrap items-center gap-2">
        {STAGES.map(({ key, label }) => {
          const count = key === "all" ? lifecycleCounts.total : (lifecycleCounts[key] ?? 0);
          const isActive = key === "all" ? stageFilter === null : stageFilter === key;

          return (
            <button
              key={key}
              onClick={() => handleFilterChange(key === "all" ? null : key)}
              className={`rounded-full px-3 py-1 font-data text-xs font-medium transition-colors ${
                isActive
                  ? key === "all"
                    ? "bg-text-main text-white"
                    : STAGE_COLORS[key] ?? "bg-gray-200 text-text-main"
                  : "bg-gray-100 text-text-main-muted hover:bg-gray-200"
              }`}
            >
              {label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-64 rounded-md border border-gray-300 bg-white px-3 py-2 font-body text-sm text-text-main placeholder:text-gray-400 focus:border-accent focus:outline-none"
        />
        <span className="font-data text-xs text-text-main-muted">
          {total.toLocaleString()} contacts
        </span>
      </div>

      {/* Table */}
      <div className="rounded-[--radius-card] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-text-main-muted">
                <SortableHeader
                  label="Name"
                  column="last_name"
                  currentSort={sortBy}
                  currentAsc={sortAsc}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Email"
                  column="email"
                  currentSort={sortBy}
                  currentAsc={sortAsc}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Score"
                  column="engagement_score"
                  currentSort={sortBy}
                  currentAsc={sortAsc}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Stage"
                  column="lifecycle_stage"
                  currentSort={sortBy}
                  currentAsc={sortAsc}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Last Order"
                  column="last_order_at"
                  currentSort={sortBy}
                  currentAsc={sortAsc}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-text-main-muted"
                  >
                    Loading...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-text-main-muted"
                  >
                    {search
                      ? "No contacts match your search."
                      : "No contacts yet. Import data from the Data page."}
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <Link
                        href={`/audience/${c.id}`}
                        className="text-sm font-medium text-text-main hover:text-accent"
                      >
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                          "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-data text-xs text-text-main-muted">
                      {c.email ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-data text-xs text-text-main">
                      {c.engagement_score}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 font-data text-xs font-medium ${
                          STAGE_COLORS[c.lifecycle_stage] ??
                          "bg-gray-100 text-text-main-muted"
                        }`}
                      >
                        {c.lifecycle_stage.replace("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-data text-xs text-text-main-muted">
                      {c.last_order_at
                        ? new Date(c.last_order_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <span className="font-data text-xs text-text-main-muted">
              Showing {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0 || loading}
                className="rounded-md border border-gray-300 px-2 py-1 font-data text-xs text-text-main transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                &larr;
              </button>
              <span className="px-2 font-data text-xs text-text-main-muted">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1 || loading}
                className="rounded-md border border-gray-300 px-2 py-1 font-data text-xs text-text-main transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  column,
  currentSort,
  currentAsc,
  onSort,
}: {
  label: string;
  column: string;
  currentSort: string;
  currentAsc: boolean;
  onSort: (column: string) => void;
}) {
  const isActive = currentSort === column;
  return (
    <th
      onClick={() => onSort(column)}
      className="cursor-pointer select-none px-4 py-2 font-body font-medium transition-colors hover:text-text-main"
    >
      {label}
      {isActive && (
        <span className="ml-1">{currentAsc ? "\u25B2" : "\u25BC"}</span>
      )}
    </th>
  );
}
