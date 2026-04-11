"use client";

import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { CONTACT_FIELDS, OPERATOR_LABELS } from "@/lib/segments/types";
import type { RuleOperator } from "@/lib/segments/types";

import type { Node, NodeProps } from "@xyflow/react";

type ConditionNodeData = {
  label: string;
  field: string;
  operator: string;
  value: string | number | boolean;
};

export type ConditionNode = Node<ConditionNodeData, "condition">;

export function ConditionNode({ data }: NodeProps<ConditionNode>) {
  const fieldLabel = data.field
    ? (CONTACT_FIELDS[data.field]?.label ?? data.field)
    : "";
  const opLabel = OPERATOR_LABELS[data.operator as RuleOperator] ?? data.operator;
  const conditionText = data.field
    ? `${fieldLabel} ${opLabel} ${String(data.value)}`
    : "Not configured";

  return (
    <div className="min-w-[180px] rounded-lg border-2 border-orange-500 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <GitBranch size={16} className="text-orange-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-orange-500">
          Condition
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-gray-900">{data.label}</p>
      <p className="mt-0.5 text-xs text-gray-500">{conditionText}</p>

      <div className="mt-2 flex justify-between text-[10px] font-medium text-gray-400">
        <span>Yes</span>
        <span>No</span>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: "30%" }}
        className="!bg-gray-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: "70%" }}
        className="!bg-gray-400"
      />
    </div>
  );
}
