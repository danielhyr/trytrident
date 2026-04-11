"use client";

import { useEffect, useState } from "react";
import {
  Clock3,
  Flag,
  GitBranch,
  Mail,
  MessageSquareText,
  Smartphone,
} from "lucide-react";

type JourneyStepType =
  | "send_email"
  | "send_sms"
  | "send_push"
  | "wait"
  | "condition"
  | "split"
  | "exit";

interface JourneyPlanCardProps {
  plan: {
    name: string;
    triggerLabel: string;
    triggerType: "event" | "segment";
    stepSummary: Array<{ label: string; type: JourneyStepType }>;
    nodeCount: number;
    estimatedTemplates: number;
    channelBreakdown: {
      email: number;
      sms: number;
      push: number;
    };
  };
  isChatBusy: boolean;
  onConfirm: () => void;
  onEdit?: () => void;
}

export function JourneyPlanCard({
  plan,
  isChatBusy,
  onConfirm,
  onEdit,
}: JourneyPlanCardProps) {
  const [confirmState, setConfirmState] = useState<"idle" | "loading" | "confirmed">(
    "idle"
  );

  useEffect(() => {
    if (confirmState === "loading" && isChatBusy) {
      setConfirmState("confirmed");
    }
  }, [confirmState, isChatBusy]);

  const handleConfirm = () => {
    if (confirmState !== "idle") return;
    setConfirmState("loading");
    onConfirm();
  };

  return (
    <div className="w-full max-w-[36rem] rounded-[--radius-card] bg-white p-4 shadow-sm ring-1 ring-[#DDE1E8]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-headline text-base font-semibold text-text-main">
            {plan.name}
          </p>
          <p className="mt-1 text-xs text-text-main-muted">
            {plan.triggerType === "segment" ? "Segment trigger" : "Event trigger"} ·{" "}
            {plan.triggerLabel}
          </p>
        </div>
        <span className="rounded-full bg-[#E8F8F7] px-2.5 py-1 text-[11px] font-medium text-[#08786E]">
          Preview
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {plan.stepSummary.map((step, index) => {
          const Icon = getStepIcon(step.type);

          return (
            <div key={`${step.type}-${index}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F4F9] text-[#475569] ring-1 ring-[#DDE1E8]">
                  <Icon size={15} />
                </div>
                {index < plan.stepSummary.length - 1 ? (
                  <div className="mt-1 h-7 w-px bg-[#DDE1E8]" />
                ) : null}
              </div>
              <div className="pt-1">
                <p className="text-sm font-medium text-text-main">{step.label}</p>
                <p className="mt-0.5 text-xs text-text-main-muted">
                  {formatStepType(step.type)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-[#E2E8F0] pt-3 text-xs text-text-main-muted">
        {plan.nodeCount} nodes · {plan.channelBreakdown.email} emails
        {plan.channelBreakdown.sms ? ` · ${plan.channelBreakdown.sms} SMS` : ""}
        {plan.channelBreakdown.push ? ` · ${plan.channelBreakdown.push} push` : ""}
        {" · "}
        {plan.estimatedTemplates} templates to generate
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmState !== "idle"}
          className="rounded-md bg-[#0ACDBC] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#09b8a9] disabled:cursor-not-allowed disabled:bg-[#8BE7DE]"
        >
          {confirmState === "idle"
            ? "Confirm & Build"
            : confirmState === "loading"
              ? "Sending..."
              : "Building..."}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-medium text-[#0B7F75] underline decoration-[#9AE6DF] underline-offset-4"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function getStepIcon(type: JourneyStepType) {
  switch (type) {
    case "send_sms":
      return MessageSquareText;
    case "send_push":
      return Smartphone;
    case "wait":
      return Clock3;
    case "condition":
    case "split":
      return GitBranch;
    case "exit":
      return Flag;
    case "send_email":
    default:
      return Mail;
  }
}

function formatStepType(type: JourneyStepType) {
  switch (type) {
    case "send_email":
      return "Email";
    case "send_sms":
      return "SMS";
    case "send_push":
      return "Push";
    case "wait":
      return "Delay";
    case "condition":
      return "Conditional branch";
    case "split":
      return "A/B split";
    case "exit":
      return "Exit";
  }
}
