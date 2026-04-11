"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  RuleGroup,
  RuleNode,
  RuleCondition,
  RuleOperator,
  RuleCombinator,
} from "@/lib/segments/types";
import {
  CONTACT_FIELDS,
  OPERATORS_BY_TYPE,
  OPERATOR_LABELS,
  defaultCondition,
} from "@/lib/segments/types";
import { previewSegmentRules } from "@/app/actions/segments";

// ---- Public API ----

interface RuleBuilderProps {
  group: RuleGroup;
  onChange: (group: RuleGroup) => void;
}

export function RuleBuilder({ group, onChange }: RuleBuilderProps) {
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function handlePreview() {
    setPreviewing(true);
    setPreviewError(null);
    setPreviewCount(null);
    const result = await previewSegmentRules(group, { countOnly: true });
    if ("error" in result) setPreviewError(result.error);
    else setPreviewCount(result.result.count);
    setPreviewing(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <GroupEditor group={group} onChange={onChange} isRoot />

      {/* Footer: add + preview */}
      <div className="flex items-center gap-3">
        <button
          onClick={() =>
            onChange({ ...group, children: [...group.children, defaultCondition()] })
          }
          className="text-xs font-medium text-accent transition-opacity hover:opacity-80"
        >
          + Add condition
        </button>
        <button
          onClick={handlePreview}
          disabled={previewing}
          className="rounded-md border border-accent bg-transparent px-3 py-1 font-data text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
        >
          {previewing ? "Counting..." : "Preview Count"}
        </button>
        {previewCount !== null && (
          <span className="font-data text-xs text-text-main">
            {previewCount.toLocaleString()} contacts match
          </span>
        )}
        {previewError && (
          <span className="font-data text-xs text-danger">{previewError}</span>
        )}
      </div>

      {/* Live filter summary */}
      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <p className="font-data text-[11px] text-text-main-muted">
          {describeGroup(group) || "No conditions"}
        </p>
      </div>
    </div>
  );
}

// ---- Recursive group editor with drag-and-drop ----

interface GroupEditorProps {
  group: RuleGroup;
  onChange: (group: RuleGroup) => void;
  onRemove?: () => void;
  isRoot?: boolean;
}

function GroupEditor({ group, onChange, onRemove, isRoot }: GroupEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Stable IDs for sortable — use index-based keys since conditions don't have IDs
  const itemIds = useMemo(
    () => group.children.map((_, i) => `item-${i}`),
    [group.children]
  );

  const activeIndex = activeId ? itemIds.indexOf(activeId) : -1;
  const activeNode = activeIndex >= 0 ? group.children[activeIndex] : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = itemIds.indexOf(active.id as string);
    const newIndex = itemIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = [...group.children];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange({ ...group, children: next });
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  function updateChild(index: number, node: RuleNode) {
    const next = [...group.children];
    next[index] = node;
    onChange({ ...group, children: next });
  }

  function removeChild(index: number) {
    const next = group.children.filter((_, i) => i !== index);
    if (next.length === 0 && onRemove) {
      onRemove();
      return;
    }
    onChange({ ...group, children: next });
  }

  /** Group this child with the one above it into a nested group */
  function groupWithAbove(index: number) {
    if (index === 0) return;
    const above = group.children[index - 1];
    const current = group.children[index];

    // If above is already a group, add current into it
    if (above.type === "group") {
      const updatedAbove: RuleGroup = {
        ...above,
        children: [...above.children, current],
      };
      const next = [...group.children];
      next[index - 1] = updatedAbove;
      next.splice(index, 1);
      onChange({ ...group, children: next });
      return;
    }

    // Create a new group containing both
    const newGroup: RuleGroup = {
      type: "group",
      combinator: group.combinator === "and" ? "or" : "and",
      children: [above, current],
    };
    const next = [...group.children];
    next.splice(index - 1, 2, newGroup);
    onChange({ ...group, children: next });
  }

  /** Ungroup: dissolve a child group, splicing its children into this level */
  function ungroupChild(index: number) {
    const child = group.children[index];
    if (child.type !== "group") return;
    const next = [...group.children];
    next.splice(index, 1, ...child.children);
    onChange({ ...group, children: next });
  }

  return (
    <div
      className={`relative rounded-md border ${
        isRoot
          ? "border-gray-200 bg-white"
          : "border-gray-300 bg-gray-50/80"
      }`}
    >
      {/* Group combinator badge — right edge */}
      {group.children.length > 1 && (
        <button
          onClick={() =>
            onChange({
              ...group,
              combinator: group.combinator === "and" ? "or" : "and",
            })
          }
          className={`absolute -right-px top-1/2 z-10 -translate-y-1/2 translate-x-full rounded-r-md border border-l-0 px-2 py-3 font-data text-[10px] font-bold uppercase tracking-wider transition-colors ${
            group.combinator === "and"
              ? "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"
              : "border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100"
          }`}
          title={`Switch to ${group.combinator === "and" ? "OR" : "AND"}`}
        >
          {group.combinator}
        </button>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {group.children.map((node, index) => (
            <SortableItem key={itemIds[index]} id={itemIds[index]} isDragOverlay={false}>
              {node.type === "condition" ? (
                <ConditionRow
                  condition={node}
                  onChange={(c) => updateChild(index, c)}
                  onRemove={
                    group.children.length > 1 || !isRoot
                      ? () => removeChild(index)
                      : undefined
                  }
                  onGroupWithAbove={
                    index > 0 ? () => groupWithAbove(index) : undefined
                  }
                />
              ) : (
                <div className="flex items-start gap-1 px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <GroupEditor
                      group={node}
                      onChange={(g) => updateChild(index, g)}
                      onRemove={() => removeChild(index)}
                    />
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 pt-1">
                    <button
                      onClick={() => ungroupChild(index)}
                      className="rounded px-1.5 py-0.5 text-[10px] text-text-main-muted transition-colors hover:bg-gray-200 hover:text-text-main"
                      title="Ungroup — dissolve this group"
                    >
                      ungroup
                    </button>
                  </div>
                </div>
              )}
            </SortableItem>
          ))}
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeNode ? (
            <div className="rounded-md border border-accent/40 bg-white shadow-lg">
              <div className="flex items-center">
                <div className="flex shrink-0 items-center px-1.5 py-3 text-accent">
                  <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
                    <circle cx="2" cy="2" r="1.5" />
                    <circle cx="8" cy="2" r="1.5" />
                    <circle cx="2" cy="8" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="2" cy="14" r="1.5" />
                    <circle cx="8" cy="14" r="1.5" />
                  </svg>
                </div>
                <div className="px-2 py-2 font-data text-xs text-text-main">
                  {activeNode.type === "condition"
                    ? `${CONTACT_FIELDS[activeNode.field]?.label ?? activeNode.field} ${OPERATOR_LABELS[activeNode.operator]} ${activeNode.value ?? ""}`
                    : `Group (${activeNode.children.length} rules)`}
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ---- Sortable wrapper ----

function SortableItem({
  id,
  children,
  isDragOverlay,
}: {
  id: string;
  children: React.ReactNode;
  isDragOverlay: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: transition ?? "transform 200ms ease",
    opacity: isDragging ? 0.3 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-b border-gray-100 last:border-0"
    >
      <div className="flex items-center">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex shrink-0 cursor-grab items-center px-1.5 py-3 text-gray-400 transition-colors hover:text-text-main active:cursor-grabbing"
          title="Drag to reorder"
        >
          <svg
            width="10"
            height="16"
            viewBox="0 0 10 16"
            fill="currentColor"
          >
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
            <circle cx="8" cy="14" r="1.5" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

// ---- Single condition row ----

const fieldGroups = groupFieldsByCategory();

function groupFieldsByCategory() {
  const groups: Record<
    string,
    Array<{ key: string; label: string; type: string }>
  > = {};
  for (const [key, def] of Object.entries(CONTACT_FIELDS)) {
    if (!groups[def.category]) groups[def.category] = [];
    groups[def.category].push({ key, label: def.label, type: def.type });
  }
  return groups;
}

function getFieldType(field: string): string {
  if (field.startsWith("custom_attributes.")) return "string";
  return CONTACT_FIELDS[field]?.type ?? "string";
}

function getOperators(fieldType: string): RuleOperator[] {
  return OPERATORS_BY_TYPE[fieldType] ?? OPERATORS_BY_TYPE.string;
}

interface ConditionRowProps {
  condition: RuleCondition;
  onChange: (c: RuleCondition) => void;
  onRemove?: () => void;
  onGroupWithAbove?: () => void;
}

function ConditionRow({
  condition,
  onChange,
  onRemove,
  onGroupWithAbove,
}: ConditionRowProps) {
  const fieldType = getFieldType(condition.field);
  const operators = getOperators(fieldType);
  const needsValue =
    condition.operator !== "is_null" && condition.operator !== "is_not_null";
  const isBetween = condition.operator === "between";

  function update(updates: Partial<RuleCondition>) {
    const next = { ...condition, ...updates };
    if (updates.field !== undefined) {
      const type = getFieldType(updates.field);
      const ops = getOperators(type);
      if (!ops.includes(next.operator)) next.operator = ops[0];
      next.value = type === "boolean" ? true : "";
    }
    if (updates.operator === "is_null" || updates.operator === "is_not_null") {
      delete next.value;
    } else if (updates.operator === "between" && !Array.isArray(next.value)) {
      next.value = ["", ""];
    }
    onChange(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-2 py-2">
      {/* Field */}
      <select
        value={condition.field}
        onChange={(e) => update({ field: e.target.value })}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 font-data text-xs text-text-main focus:border-accent focus:outline-none"
      >
        {Object.entries(fieldGroups).map(([category, fields]) => (
          <optgroup key={category} label={category}>
            {fields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </optgroup>
        ))}
        <optgroup label="Custom">
          <option value="custom_attributes.">custom_attributes...</option>
        </optgroup>
      </select>

      {condition.field.startsWith("custom_attributes.") && (
        <input
          type="text"
          value={condition.field.replace("custom_attributes.", "")}
          onChange={(e) =>
            update({ field: `custom_attributes.${e.target.value}` })
          }
          placeholder="key"
          className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1.5 font-data text-xs text-text-main placeholder:text-gray-400 focus:border-accent focus:outline-none"
        />
      )}

      {/* Operator */}
      <select
        value={condition.operator}
        onChange={(e) => update({ operator: e.target.value as RuleOperator })}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 font-data text-xs text-text-main focus:border-accent focus:outline-none"
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>

      {/* Value */}
      {needsValue && !isBetween && fieldType === "boolean" && (
        <select
          value={String(condition.value)}
          onChange={(e) => update({ value: e.target.value === "true" })}
          className="rounded-md border border-gray-300 bg-white px-2 py-1.5 font-data text-xs text-text-main focus:border-accent focus:outline-none"
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )}

      {needsValue && !isBetween && fieldType !== "boolean" && (
        <input
          type={
            fieldType === "number"
              ? "number"
              : fieldType === "date"
                ? "date"
                : "text"
          }
          value={String(condition.value ?? "")}
          onChange={(e) =>
            update({
              value:
                fieldType === "number"
                  ? Number(e.target.value)
                  : e.target.value,
            })
          }
          placeholder="value"
          className="w-32 rounded-md border border-gray-300 bg-white px-2 py-1.5 font-data text-xs text-text-main placeholder:text-gray-400 focus:border-accent focus:outline-none"
        />
      )}

      {needsValue && isBetween && (
        <>
          <input
            type={
              fieldType === "number"
                ? "number"
                : fieldType === "date"
                  ? "date"
                  : "text"
            }
            value={String(
              Array.isArray(condition.value) ? condition.value[0] : ""
            )}
            onChange={(e) => {
              const arr = Array.isArray(condition.value)
                ? [...condition.value]
                : ["", ""];
              arr[0] =
                fieldType === "number"
                  ? Number(e.target.value)
                  : e.target.value;
              update({
                value: arr as [string | number, string | number],
              });
            }}
            placeholder="min"
            className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1.5 font-data text-xs text-text-main placeholder:text-gray-400 focus:border-accent focus:outline-none"
          />
          <span className="text-xs text-text-main-muted">and</span>
          <input
            type={
              fieldType === "number"
                ? "number"
                : fieldType === "date"
                  ? "date"
                  : "text"
            }
            value={String(
              Array.isArray(condition.value) ? condition.value[1] : ""
            )}
            onChange={(e) => {
              const arr = Array.isArray(condition.value)
                ? [...condition.value]
                : ["", ""];
              arr[1] =
                fieldType === "number"
                  ? Number(e.target.value)
                  : e.target.value;
              update({
                value: arr as [string | number, string | number],
              });
            }}
            placeholder="max"
            className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1.5 font-data text-xs text-text-main placeholder:text-gray-400 focus:border-accent focus:outline-none"
          />
        </>
      )}

      {/* Right-side actions */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {onGroupWithAbove && (
          <button
            onClick={onGroupWithAbove}
            className="rounded px-1.5 py-0.5 text-[10px] text-text-main-muted transition-colors hover:bg-accent/10 hover:text-accent"
            title="Group with condition above"
          >
            &#x23A7;
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-text-main-muted transition-colors hover:text-danger"
            title="Remove"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Plain-English filter summary ----

function describeGroup(group: RuleGroup): string {
  if (group.children.length === 0) return "";
  const parts = group.children.map(describeNode).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const joiner = group.combinator === "and" ? " AND " : " OR ";
  return parts.join(joiner);
}

function describeNode(node: RuleNode): string {
  if (node.type === "group") {
    const inner = describeGroup(node);
    return inner ? `(${inner})` : "";
  }
  return describeCondition(node);
}

function describeCondition(c: RuleCondition): string {
  const label = CONTACT_FIELDS[c.field]?.label ?? c.field;
  const op = OPERATOR_LABELS[c.operator] ?? c.operator;

  if (c.operator === "is_null" || c.operator === "is_not_null") {
    return `${label} ${op}`;
  }
  if (c.operator === "between" && Array.isArray(c.value)) {
    return `${label} ${op} ${c.value[0]} and ${c.value[1]}`;
  }
  const val = c.value === undefined || c.value === "" ? "?" : String(c.value);
  return `${label} ${op} ${val}`;
}
