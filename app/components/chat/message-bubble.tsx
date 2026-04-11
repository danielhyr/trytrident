"use client";

import { isTextUIPart, isToolUIPart, getToolName } from "ai";
import type { UIMessage } from "ai";
import { Bot, User, Wrench } from "lucide-react";
import type { ComponentProps } from "react";
import { JourneyPlanCard } from "@/components/chat/journey-plan-card";

interface MessageBubbleProps {
  message: UIMessage;
  onSendMessage?: (text: string) => void;
  isChatBusy?: boolean;
}

export function MessageBubble({
  message,
  onSendMessage,
  isChatBusy = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-[#0ACDBC] text-white shadow-sm"
            : "bg-white text-[#64748B] shadow-sm ring-1 ring-[#DDE1E8]"
        }`}
      >
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      {/* Content */}
      <div
        className={`flex max-w-[75%] flex-col gap-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {message.parts.map((part, i) => {
          if (isTextUIPart(part)) {
            if (!part.text) return null;
            return (
              <div
                key={`${message.id}-${i}`}
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? "bg-[#E8F8F7] text-[#1E293B] ring-1 ring-[#b3ece8]"
                    : "bg-white text-[#1E293B] ring-1 ring-[#DDE1E8]"
                }`}
              >
                <div className="whitespace-pre-wrap">{part.text}</div>
              </div>
            );
          }

          if (isToolUIPart(part)) {
            const toolName = getToolName(part);
            const toolLabel = formatToolLabel(toolName);
            const isRunning =
              part.state === "input-streaming" ||
              part.state === "input-available";
            const isComplete = part.state === "output-available" || part.state === "output-error";

            if (
              toolName === "proposeJourney" &&
              isComplete &&
              "output" in part &&
              part.output
            ) {
              return (
                <JourneyPlanCard
                  key={`${message.id}-${i}`}
                  plan={part.output as ComponentProps<typeof JourneyPlanCard>["plan"]}
                  isChatBusy={isChatBusy}
                  onConfirm={() => onSendMessage?.("Confirm and build this journey.")}
                  onEdit={() => onSendMessage?.("Please revise this journey plan.")}
                />
              );
            }

            return (
              <div
                key={`${message.id}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-[#F1F5F9] px-3 py-2 text-xs text-[#64748B]"
              >
                <Wrench size={12} className="shrink-0 text-[#0ACDBC]" />
                {isRunning ? (
                  <span className="animate-pulse">{toolLabel}...</span>
                ) : (
                  <span>{toolLabel} — done</span>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

function formatToolLabel(name: string): string {
  const labels: Record<string, string> = {
    queryContacts: "Searching contacts",
    querySegments: "Listing segments",
    createSegment: "Creating segment",
    getPipelineStats: "Fetching pipeline stats",
    getShopifyStatus: "Checking Shopify status",
    proposeJourney: "Preparing journey plan",
    executeJourney: "Building journey",
  };
  return labels[name] ?? name;
}
