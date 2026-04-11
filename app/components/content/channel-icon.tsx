"use client";

import { Mail, MessageSquare, Bell } from "lucide-react";
import type { ContentChannel } from "@/lib/content/types";
import { CHANNEL_CONFIG } from "@/lib/content/types";

interface ChannelIconProps {
  channel: ContentChannel;
  size?: number;
  showLabel?: boolean;
}

const ICONS = {
  email: Mail,
  sms: MessageSquare,
  push: Bell,
} as const;

export function ChannelIcon({
  channel,
  size = 16,
  showLabel = false,
}: ChannelIconProps) {
  const config = CHANNEL_CONFIG[channel];
  const Icon = ICONS[channel];

  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={size} style={{ color: config.color }} />
      {showLabel && (
        <span className="text-xs font-medium" style={{ color: config.color }}>
          {config.label}
        </span>
      )}
    </span>
  );
}
