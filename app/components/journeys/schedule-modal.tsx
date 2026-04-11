"use client";

import { useState } from "react";
import { X, Clock, Send } from "lucide-react";

interface ScheduleModalProps {
  onConfirm: (schedule: { scheduled_for: string; timezone: string } | null) => void;
  onClose: () => void;
}

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Australia/Sydney",
  "Asia/Tokyo",
  "Asia/Singapore",
];

function formatTzLabel(tz: string): string {
  try {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? "";
    return `${tz.replace(/_/g, " ")} (${offset})`;
  } catch {
    return tz;
  }
}

export function ScheduleModal({ onConfirm, onClose }: ScheduleModalProps) {
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const handleConfirm = () => {
    if (mode === "now") {
      onConfirm(null);
      return;
    }

    if (!date || !time) return;

    // Build ISO 8601 from date + time + timezone
    const dtStr = `${date}T${time}:00`;
    const localDate = new Date(
      new Date(dtStr).toLocaleString("en-US", { timeZone: timezone })
    );
    // Use the timezone-aware approach: create a date string and let the server handle it
    // We send the raw datetime + timezone and let the cron compare properly
    const scheduled_for = new Date(dtStr).toISOString();

    onConfirm({ scheduled_for, timezone });
  };

  const isValid = mode === "now" || (date && time);

  // Minimum date is today
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-card-border bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
          <h2 className="text-base font-semibold text-text-main">
            Activate Journey
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-main-muted transition-colors hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-5">
          {/* Send Now option */}
          <button
            onClick={() => setMode("now")}
            className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
              mode === "now"
                ? "border-accent bg-accent/5"
                : "border-card-border hover:border-gray-300"
            }`}
          >
            <Send
              size={20}
              className={mode === "now" ? "text-accent" : "text-gray-400"}
            />
            <div>
              <p className="text-sm font-medium text-text-main">Send Now</p>
              <p className="text-xs text-text-main-muted">
                Enroll all matching contacts immediately
              </p>
            </div>
          </button>

          {/* Schedule option */}
          <button
            onClick={() => setMode("schedule")}
            className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
              mode === "schedule"
                ? "border-accent bg-accent/5"
                : "border-card-border hover:border-gray-300"
            }`}
          >
            <Clock
              size={20}
              className={
                mode === "schedule" ? "text-accent" : "text-gray-400"
              }
            />
            <div>
              <p className="text-sm font-medium text-text-main">
                Schedule for Later
              </p>
              <p className="text-xs text-text-main-muted">
                Pick a date and time to start enrollment
              </p>
            </div>
          </button>

          {/* Schedule fields */}
          {mode === "schedule" && (
            <div className="space-y-3 rounded-lg border border-card-border bg-gray-50 p-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-text-main-muted">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={today}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-text-main-muted">
                    Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-main-muted">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {formatTzLabel(tz)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-card-border px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-text-main-muted transition-colors hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {mode === "now" ? "Activate & Send" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
