"use client";

import {
  Zap,
  Mail,
  MessageSquare,
  Bell,
  Clock,
  GitBranch,
  Scissors,
  Flag,
  Settings,
} from "lucide-react";

interface NodePaletteProps {
  onAddNode: (type: string, subType?: string) => void;
}

const PALETTE_ITEMS = [
  { type: "trigger", label: "Entry", icon: Zap, color: "#10B981" },
  { type: "action", subType: "send_email", label: "Email", icon: Mail, color: "#3B82F6" },
  { type: "action", subType: "send_sms", label: "SMS", icon: MessageSquare, color: "#22C55E" },
  { type: "action", subType: "send_push", label: "Push", icon: Bell, color: "#8B5CF6" },
  { type: "action", subType: "update_attribute", label: "Update", icon: Settings, color: "#6B7280" },
  { type: "wait", label: "Wait", icon: Clock, color: "#F59E0B" },
  { type: "condition", label: "Condition", icon: GitBranch, color: "#F97316" },
  { type: "split", label: "Split", icon: Scissors, color: "#8B5CF6" },
  { type: "exit", label: "Exit", icon: Flag, color: "#EF4444" },
];

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-card-border bg-white px-2 py-1.5 shadow-lg">
      {PALETTE_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.subType ?? item.type}
            onClick={() => onAddNode(item.type, item.subType)}
            title={item.label}
            className="flex flex-col items-center gap-0.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-gray-100"
          >
            <Icon size={16} style={{ color: item.color }} />
            <span className="text-[10px] font-medium text-gray-600">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
