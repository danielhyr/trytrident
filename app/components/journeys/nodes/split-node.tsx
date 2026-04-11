"use client";

import { Handle, Position } from "@xyflow/react";
import { Scissors } from "lucide-react";

import type { Node, NodeProps } from "@xyflow/react";

type SplitNodeData = {
  label: string;
  split_a_percent: number;
};

export type SplitNode = Node<SplitNodeData, "split">;

export function SplitNode({ data }: NodeProps<SplitNode>) {
  const splitB = 100 - data.split_a_percent;

  return (
    <div className="min-w-[180px] rounded-lg border-2 border-purple-500 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Scissors size={16} className="text-purple-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-purple-500">
          A/B Split
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-gray-900">{data.label}</p>
      <p className="mt-0.5 text-xs text-gray-500">
        A: {data.split_a_percent}% / B: {splitB}%
      </p>

      <div className="mt-2 flex justify-between text-[10px] font-medium text-gray-400">
        <span>A</span>
        <span>B</span>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={{ left: "30%" }}
        className="!bg-gray-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        style={{ left: "70%" }}
        className="!bg-gray-400"
      />
    </div>
  );
}
