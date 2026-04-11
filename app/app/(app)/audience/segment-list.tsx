"use client";

import { useState } from "react";
import type { Segment, RuleGroup } from "@/lib/segments/types";
import { defaultGroup } from "@/lib/segments/types";
import { RuleBuilder } from "./rule-builder";
import { createSegment } from "@/app/actions/segments";

interface SegmentListProps {
  segments: Segment[];
  canManage: boolean;
  onSelect: (id: string) => void;
  onCreated: (segment: Segment) => void;
}

export function SegmentList({
  segments,
  canManage,
  onSelect,
  onCreated,
}: SegmentListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleGroup, setRuleGroup] = useState<RuleGroup>(defaultGroup());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSegments = segments.filter((s) => s.status === "active");
  const archivedSegments = segments.filter((s) => s.status === "archived");

  async function handleCreate() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setCreating(true);
    setError(null);

    const result = await createSegment({ name: name.trim(), description: description.trim() || undefined, rules: ruleGroup });

    if ("error" in result) {
      setError(result.error);
      setCreating(false);
      return;
    }

    onCreated(result.segment);
    setShowCreate(false);
    setName("");
    setDescription("");
    setRuleGroup(defaultGroup());
    setCreating(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Create button */}
      {canManage && !showCreate && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-[--radius-card] bg-accent px-4 py-2 font-body text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            Create Segment
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-[--radius-card] bg-white p-5">
          <h3 className="font-headline text-sm font-semibold text-text-main">
            New Segment
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Segment name"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-body text-sm text-text-main placeholder:text-gray-400 focus:border-accent focus:outline-none"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-body text-sm text-text-main placeholder:text-gray-400 focus:border-accent focus:outline-none"
            />

            <RuleBuilder group={ruleGroup} onChange={setRuleGroup} />

            {error && (
              <p className="text-xs text-danger">{error}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="rounded-[--radius-card] bg-accent px-4 py-2 font-data text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setError(null);
                }}
                className="rounded-[--radius-card] border border-gray-300 px-4 py-2 font-data text-sm font-medium text-text-main transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Segments table */}
      {activeSegments.length === 0 && !showCreate ? (
        <div className="rounded-[--radius-card] bg-white px-4 py-12 text-center">
          <p className="text-sm text-text-main-muted">
            No segments yet.{" "}
            {canManage
              ? "Create your first segment to start targeting contacts."
              : "Ask an admin to create segments."}
          </p>
        </div>
      ) : (
        <div className="rounded-[--radius-card] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-text-main-muted">
                  <th className="px-4 py-3 font-body font-medium">Name</th>
                  <th className="px-4 py-3 font-body font-medium">Contacts</th>
                  <th className="px-4 py-3 font-body font-medium">Status</th>
                  <th className="px-4 py-3 font-body font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {activeSegments.map((segment) => (
                  <tr
                    key={segment.id}
                    onClick={() => onSelect(segment.id)}
                    className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-body text-sm font-medium text-text-main">
                        {segment.name}
                      </p>
                      {segment.description && (
                        <p className="mt-0.5 text-xs text-text-main-muted">
                          {segment.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-data text-sm text-text-main">
                      {segment.contact_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={segment.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-data text-xs text-text-main-muted">
                      {new Date(segment.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Archived segments */}
      {archivedSegments.length > 0 && (
        <details className="rounded-[--radius-card] bg-white p-4">
          <summary className="cursor-pointer font-headline text-xs font-semibold text-text-main-muted">
            Archived ({archivedSegments.length})
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody>
                {archivedSegments.map((segment) => (
                  <tr
                    key={segment.id}
                    onClick={() => onSelect(segment.id)}
                    className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 last:border-0"
                  >
                    <td className="px-4 py-2 font-body text-sm text-text-main-muted">
                      {segment.name}
                    </td>
                    <td className="px-4 py-2 font-data text-xs text-text-main-muted">
                      {segment.contact_count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 font-data text-xs text-success">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-data text-xs text-text-main-muted">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
      Archived
    </span>
  );
}
