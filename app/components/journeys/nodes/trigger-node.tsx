"use client";

import { Handle, Position } from "@xyflow/react";
import { Zap, Users } from "lucide-react";
import { TRIGGER_EVENT_TYPES } from "@/lib/journeys/types";
import type { TriggerType } from "@/lib/journeys/types";

import type { Node, NodeProps } from "@xyflow/react";

type TriggerNodeData = {
  label: string;
  trigger_type?: TriggerType;
  event_type?: string;
  segment_id?: string;
  segment_name?: string;
};

export type TriggerNode = Node<TriggerNodeData, "trigger">;

export function TriggerNode({ data }: NodeProps<TriggerNode>) {
  const isSegment = (data.trigger_type ?? "event") === "segment";

  const subtitle = isSegment
    ? data.segment_name ?? "No segment selected"
    : TRIGGER_EVENT_TYPES.find((e) => e.value === data.event_type)?.label ??
      data.event_type ??
      "Not configured";

  const Icon = isSegment ? Users : Zap;

  return (
    <div className="min-w-[180px] rounded-lg border-2 border-emerald-500 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-emerald-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
          Entry
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-gray-900">{data.label}</p>
      <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400"
      />
    </div>
  );
}
