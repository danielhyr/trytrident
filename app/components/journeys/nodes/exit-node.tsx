"use client";

import { Handle, Position } from "@xyflow/react";
import { Flag } from "lucide-react";

import type { Node, NodeProps } from "@xyflow/react";

type ExitNodeData = {
  label: string;
  exit_reason?: string;
};

export type ExitNode = Node<ExitNodeData, "exit">;

export function ExitNode({ data }: NodeProps<ExitNode>) {
  return (
    <div className="min-w-[180px] rounded-lg border-2 border-red-500 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Flag size={16} className="text-red-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-red-500">
          Exit
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-gray-900">{data.label}</p>
      {data.exit_reason && (
        <p className="mt-0.5 text-xs text-gray-500">{data.exit_reason}</p>
      )}

      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400"
      />
    </div>
  );
}
