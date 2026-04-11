"use client";

import { Handle, Position } from "@xyflow/react";
import { Mail, MessageSquare, Bell, Settings } from "lucide-react";

import type { Node, NodeProps } from "@xyflow/react";

type ActionNodeData = {
  label: string;
  action_type: string;
  content_template_id?: string;
  template_name?: string;
};

export type ActionNode = Node<ActionNodeData, "action">;

const actionConfig: Record<
  string,
  { border: string; text: string; icon: typeof Mail; label: string }
> = {
  send_email: { border: "border-blue-500", text: "text-blue-500", icon: Mail, label: "Send Email" },
  send_sms: {
    border: "border-emerald-500",
    text: "text-emerald-500",
    icon: MessageSquare,
    label: "Send SMS",
  },
  send_push: { border: "border-purple-500", text: "text-purple-500", icon: Bell, label: "Send Push" },
  update_attribute: {
    border: "border-gray-400",
    text: "text-gray-500",
    icon: Settings,
    label: "Update Attribute",
  },
};

const defaultConfig = actionConfig.send_email;

export function ActionNode({ data }: NodeProps<ActionNode>) {
  const config = actionConfig[data.action_type] ?? defaultConfig;
  const Icon = config.icon;

  return (
    <div
      className={`min-w-[180px] rounded-lg border-2 ${config.border} bg-white px-4 py-3 shadow-sm`}
    >
      <div className="flex items-center gap-2">
        <Icon size={16} className={config.text} />
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${config.text}`}
        >
          {config.label}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-gray-900">{data.label}</p>
      {data.template_name && (
        <p className="mt-0.5 text-xs text-gray-500">{data.template_name}</p>
      )}

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
