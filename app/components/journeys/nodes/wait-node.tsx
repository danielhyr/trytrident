"use client";

import { Handle, Position } from "@xyflow/react";
import { Clock } from "lucide-react";

import type { Node, NodeProps } from "@xyflow/react";

type WaitNodeData = {
  label: string;
  wait_type: string;
  delay_amount?: number;
  delay_unit?: string;
  wait_event_type?: string;
};

export type WaitNode = Node<WaitNodeData, "wait">;

export function WaitNode({ data }: NodeProps<WaitNode>) {
  const delayText =
    data.delay_amount && data.delay_unit
      ? `${data.delay_amount} ${data.delay_unit}`
      : data.wait_event_type
        ? `Until: ${data.wait_event_type}`
        : data.wait_type;

  return (
    <div className="min-w-[180px] rounded-lg border-2 border-amber-500 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-amber-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
          Wait
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-gray-900">{data.label}</p>
      <p className="mt-0.5 text-xs text-gray-500">{delayText}</p>

      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400"
      />
    </div>
  );
}
