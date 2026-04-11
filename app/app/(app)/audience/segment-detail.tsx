"use client";

import { useState, useEffect } from "react";
import type { Segment, RuleGroup, RuleNode } from "@/lib/segments/types";
import { OPERATOR_LABELS, CONTACT_FIELDS, normalizeRulesConfig } from "@/lib/segments/types";
import type { ContactPreview, RuleCondition } from "@/lib/segments/types";
import {
  updateSegment,
  deleteSegment,
  previewSegmentRules,
} from "@/app/actions/segments";
import { RuleBuilder } from "./rule-builder";

interface SegmentDetailProps {
  segment: Segment;
  canManage: boolean;
  onBack: () => void;
  onUpdated: (segment: Segment) => void;
  onDeleted: (segmentId: string) => void;
}

export function SegmentDetail({
  segment,
  canManage,
  onBack,
  onUpdated,
  onDeleted,
}: SegmentDetailProps) {
  const rulesConfig = normalizeRulesConfig(segment.rules);

  const [editingInfo, setEditingInfo] = useState(false);
  const [editingRules, setEditingRules] = useState(false);
  const [name, setName] = useState(segment.name);
  const [description, setDescription] = useState(segment.description ?? "");
  const [editGroup, setEditGroup] = useState<RuleGroup>(rulesConfig);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleContacts, setSampleContacts] = useState<ContactPreview[]>([]);
  const [loadingSample, setLoadingSample] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSampleContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment.id, segment.updated_at]);

  useEffect(() => {
    const config = normalizeRulesConfig(segment.rules);
    setEditGroup(config);
    setName(segment.name);
    setDescription(segment.description ?? "");
  }, [segment]);

  async function loadSampleContacts() {
    setLoadingSample(true);
    const config = normalizeRulesConfig(segment.rules);
    const result = await previewSegmentRules(config, { limit: 10 });
    if ("result" in result) {
      setSampleContacts(result.result.contacts);
    }
    setLoadingSample(false);
  }

  async function handleSaveInfo() {
    setSaving(true);
    setError(null);
    const result = await updateSegment(segment.id, {
      name: name.trim(),
      description: description.trim() || undefined,
    });
    if ("error" in result) {
      setError(result.error);
    } else {
      onUpdated(result.segment);
      setEditingInfo(false);
    }
    setSaving(false);
  }

  async function handleSaveRules() {
    setSaving(true);
    setError(null);
    const result = await updateSegment(segment.id, { rules: editGroup });
    if ("error" in result) {
      setError(result.error);
    } else {
      onUpdated(result.segment);
      setEditingRules(false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteSegment(segment.id);
    if ("error" in result) {
      setError(result.error);
      setDeleting(false);
    } else {
      onDeleted(segment.id);
    }
  }

  async function handleRefreshCount() {
    setRefreshing(true);
    const config = normalizeRulesConfig(segment.rules);
    const result = await updateSegment(segment.id, { rules: config });
    if ("segment" in result) {
      onUpdated(result.segment);
    }
    setRefreshing(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-accent transition-opacity hover:opacity-80"
        >
          &larr; Segments
        </button>
      </div>

      {/* Name / description card */}
      <div className="rounded-[--radius-card] bg-white p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editingInfo ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-headline text-lg font-semibold text-text-main focus:border-accent focus:outline-none"
                />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-text-main placeholder:text-gray-400 focus:border-accent focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveInfo}
                    disabled={saving}
                    className="rounded-md bg-accent px-3 py-1.5 font-data text-xs font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingInfo(false);
                      setName(segment.name);
                      setDescription(segment.description ?? "");
                    }}
                    className="rounded-md border border-gray-300 px-3 py-1.5 font-data text-xs font-medium text-text-main hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-headline text-lg font-semibold text-text-main">
                  {segment.name}
                </h2>
                {segment.description && (
                  <p className="mt-1 text-sm text-text-main-muted">
                    {segment.description}
                  </p>
                )}
              </>
            )}
          </div>

          {canManage && !editingInfo && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingInfo(true)}
                className="rounded-md border border-gray-300 px-3 py-1.5 font-data text-xs font-medium text-text-main transition-colors hover:bg-gray-50"
              >
                Edit
              </button>
              {confirmDelete ? (
                <>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-md bg-danger px-3 py-1.5 font-data text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 font-data text-xs font-medium text-text-main hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 font-data text-xs font-medium text-text-main-muted transition-colors hover:border-danger hover:text-danger"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>

      {/* Population */}
      <div className="rounded-[--radius-card] bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h3 className="font-headline text-xs font-semibold uppercase text-text-main-muted">
              Population
            </h3>
            <p className="font-data text-3xl font-semibold text-text-main">
              {segment.contact_count.toLocaleString()}
            </p>
            <p className="font-data text-xs text-text-main-muted">
              Updated{" "}
              {new Date(segment.updated_at).toLocaleString()}
            </p>
          </div>
          {canManage && (
            <button
              onClick={handleRefreshCount}
              disabled={refreshing}
              className="text-xs font-medium text-accent transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh Count"}
            </button>
          )}
        </div>
      </div>

      {/* Rules — full width with right padding for the AND/OR badge */}
      <div className="rounded-[--radius-card] bg-white p-5 pr-12">
        <div className="flex items-center justify-between">
          <h3 className="font-headline text-xs font-semibold uppercase text-text-main-muted">
            Rule Logic
          </h3>
          {canManage && !editingRules && (
            <button
              onClick={() => setEditingRules(true)}
              className="text-xs font-medium text-accent transition-opacity hover:opacity-80"
            >
              Edit Rules
            </button>
          )}
        </div>

        {editingRules ? (
          <div className="mt-3 flex flex-col gap-3">
            <RuleBuilder group={editGroup} onChange={setEditGroup} />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveRules}
                disabled={saving}
                className="rounded-md bg-accent px-3 py-1.5 font-data text-xs font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Rules"}
              </button>
              <button
                onClick={() => {
                  setEditingRules(false);
                  setEditGroup(rulesConfig);
                  setError(null);
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 font-data text-xs font-medium text-text-main hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <RuleGroupDisplay group={rulesConfig} />
          </div>
        )}
      </div>

      {/* Sample contacts */}
      <div className="rounded-[--radius-card] bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="font-headline text-sm font-semibold text-text-main">
            Sample Contacts
          </h3>
        </div>
        {loadingSample ? (
          <div className="px-4 py-8 text-center text-sm text-text-main-muted">
            Loading...
          </div>
        ) : sampleContacts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-main-muted">
            No contacts match these rules.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-text-main-muted">
                  <th className="px-4 py-2 font-data font-medium">Name</th>
                  <th className="px-4 py-2 font-data font-medium">Email</th>
                  <th className="px-4 py-2 font-data font-medium">Score</th>
                  <th className="px-4 py-2 font-data font-medium">Stage</th>
                  <th className="px-4 py-2 font-data font-medium">Orders</th>
                  <th className="px-4 py-2 font-data font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {sampleContacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-text-main">
                      {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                        "—"}
                    </td>
                    <td className="px-4 py-2 font-data text-xs text-text-main-muted">
                      {c.email ?? "—"}
                    </td>
                    <td className="px-4 py-2 font-data text-xs text-text-main">
                      {c.engagement_score}
                    </td>
                    <td className="px-4 py-2">
                      <LifecycleBadge stage={c.lifecycle_stage} />
                    </td>
                    <td className="px-4 py-2 font-data text-xs text-text-main">
                      {c.total_orders}
                    </td>
                    <td className="px-4 py-2 font-data text-xs text-text-main">
                      ${Number(c.total_revenue).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Read-only display of rule tree ----

function RuleGroupDisplay({ group, depth = 0 }: { group: RuleGroup; depth?: number }) {
  return (
    <div
      className={`relative flex flex-col ${
        depth > 0
          ? "ml-2 rounded-md border border-gray-200 bg-gray-50/50"
          : ""
      }`}
    >
      {group.children.length > 1 && (
        <span
          className={`absolute -right-px top-1/2 z-10 -translate-y-1/2 translate-x-full rounded-r-md border border-l-0 px-1.5 py-1 font-data text-[10px] font-bold uppercase ${
            group.combinator === "and"
              ? "border-blue-200 bg-blue-50 text-blue-500"
              : "border-amber-200 bg-amber-50 text-amber-500"
          }`}
        >
          {group.combinator}
        </span>
      )}
      {group.children.map((node, i) => (
        <div key={i}>
          {node.type === "condition" ? (
            <ConditionDisplay condition={node} />
          ) : (
            <div className="px-2 py-1">
              <RuleGroupDisplay group={node} depth={depth + 1} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ConditionDisplay({ condition }: { condition: RuleCondition }) {
  return (
    <div className="border-b border-gray-100 px-3 py-2 font-data text-xs text-text-main last:border-0">
      <span className="font-medium">
        {CONTACT_FIELDS[condition.field]?.label ?? condition.field}
      </span>{" "}
      <span className="text-text-main-muted">
        {OPERATOR_LABELS[condition.operator]}
      </span>{" "}
      {condition.operator !== "is_null" &&
        condition.operator !== "is_not_null" && (
          <span className="font-medium">
            {Array.isArray(condition.value)
              ? `${condition.value[0]} — ${condition.value[1]}`
              : String(condition.value)}
          </span>
        )}
    </div>
  );
}

function LifecycleBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    vip: "bg-accent/10 text-accent",
    active: "bg-success/10 text-success",
    at_risk: "bg-warning/10 text-warning",
    lapsed: "bg-danger/10 text-danger",
    prospect: "bg-gray-100 text-text-main-muted",
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 font-data text-xs font-medium ${
        colors[stage] ?? colors.prospect
      }`}
    >
      {stage.replace("_", " ")}
    </span>
  );
}
