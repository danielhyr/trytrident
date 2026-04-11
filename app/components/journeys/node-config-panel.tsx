"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { JourneyNode } from "@/lib/journeys/types";
import { TRIGGER_EVENT_TYPES } from "@/lib/journeys/types";
import type {
  TriggerNodeData,
  ActionNodeData,
  WaitNodeData,
  ConditionNodeData,
  SplitNodeData,
  ExitNodeData,
} from "@/lib/journeys/types";
import { CONTACT_FIELDS } from "@/lib/segments/types";
import { fetchTemplates } from "@/app/actions/content";
import { fetchSegments } from "@/app/actions/segments";
import type { ContentTemplate } from "@/lib/content/types";
import type { Segment } from "@/lib/segments/types";

interface NodeConfigPanelProps {
  node: JourneyNode;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
  journeyStatus?: string;
}

export function NodeConfigPanel({
  node,
  onUpdate,
  onClose,
  journeyStatus,
}: NodeConfigPanelProps) {
  const update = (key: string, value: unknown) => {
    onUpdate(node.id, { ...node.data, [key]: value });
  };

  const updateMultiple = (updates: Record<string, unknown>) => {
    onUpdate(node.id, { ...node.data, ...updates });
  };

  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-[350px] flex-col border-l border-card-border bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text-main">
          {node.type === "action"
            ? {
                send_email: "Send Email",
                send_sms: "Send SMS",
                send_push: "Send Push",
                update_attribute: "Update Attribute",
              }[(node.data as ActionNodeData).action_type] ?? "Configure Action"
            : node.type === "trigger"
              ? "Configure Entry"
              : `Configure ${node.type.charAt(0).toUpperCase() + node.type.slice(1)}`}
        </h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-text-main-muted transition-colors hover:bg-gray-100"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Label — common to all */}
        <Field label="Label">
          <input
            type="text"
            value={((node.data as unknown as Record<string, unknown>).label as string) ?? ""}
            onChange={(e) => update("label", e.target.value)}
            className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
          />
        </Field>

        {node.type === "trigger" && (
          <TriggerConfig
            data={node.data as TriggerNodeData}
            onUpdate={update}
            onUpdateMultiple={updateMultiple}
            locked={journeyStatus !== "draft"}
          />
        )}
        {node.type === "action" && (
          <ActionConfig
            data={node.data as ActionNodeData}
            onUpdate={update}
            onUpdateMultiple={updateMultiple}
          />
        )}
        {node.type === "wait" && (
          <WaitConfig data={node.data as WaitNodeData} onUpdate={update} />
        )}
        {node.type === "condition" && (
          <ConditionConfig
            data={node.data as ConditionNodeData}
            onUpdate={update}
          />
        )}
        {node.type === "split" && (
          <SplitConfig
            data={node.data as SplitNodeData}
            onUpdate={update}
          />
        )}
        {node.type === "exit" && (
          <ExitConfig data={node.data as ExitNodeData} onUpdate={update} />
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-xs font-medium text-text-main-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Group TRIGGER_EVENT_TYPES by category for <optgroup> rendering */
const eventCategories = TRIGGER_EVENT_TYPES.reduce<
  Record<string, { value: string; label: string }[]>
>((acc, e) => {
  (acc[e.category] ??= []).push(e);
  return acc;
}, {});

function EventSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
    >
      <option value="">Select event...</option>
      {Object.entries(eventCategories).map(([category, events]) => (
        <optgroup key={category} label={category}>
          {events.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function TriggerConfig({
  data,
  onUpdate,
  onUpdateMultiple,
  locked,
}: {
  data: TriggerNodeData;
  onUpdate: (key: string, value: unknown) => void;
  onUpdateMultiple: (updates: Record<string, unknown>) => void;
  locked?: boolean;
}) {
  const triggerType = data.trigger_type ?? "event";

  if (locked) {
    const summary =
      triggerType === "segment"
        ? data.segment_name ?? "Segment"
        : data.event_type ?? "Event";
    return (
      <Field label="Entry Type">
        <p className="rounded-md border border-card-border bg-gray-50 px-3 py-1.5 text-sm text-text-main-muted">
          {triggerType === "segment" ? "Segment" : "Event"}: {summary}
        </p>
        <p className="mt-1 text-xs text-text-main-muted">
          Entry cannot be changed after activation.
        </p>
      </Field>
    );
  }

  return (
    <>
      <Field label="Entry Type">
        <select
          value={triggerType}
          onChange={(e) => {
            const newType = e.target.value as "event" | "segment";
            if (newType === "segment") {
              onUpdateMultiple({
                trigger_type: "segment",
                event_type: undefined,
              });
            } else {
              onUpdateMultiple({
                trigger_type: "event",
                segment_id: undefined,
                segment_name: undefined,
              });
            }
          }}
          className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
        >
          <option value="event">Event</option>
          <option value="segment">Segment</option>
        </select>
      </Field>

      {triggerType === "event" ? (
        <Field label="Trigger Event">
          <EventSelect
            value={data.event_type ?? ""}
            onChange={(v) => onUpdate("event_type", v)}
          />
        </Field>
      ) : (
        <SegmentPicker
          selectedId={data.segment_id}
          onSelect={(id, name) =>
            onUpdateMultiple({ segment_id: id, segment_name: name })
          }
        />
      )}
    </>
  );
}

function SegmentPicker({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect: (id: string, name: string) => void;
}) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSegments().then((result) => {
      if (cancelled) return;
      if ("segments" in result) {
        setSegments(result.segments);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Field label="Segment">
      {loading ? (
        <p className="text-xs text-text-main-muted">Loading segments...</p>
      ) : segments.length === 0 ? (
        <p className="text-xs text-amber-600">
          No segments found. Create one in Audience first.
        </p>
      ) : (
        <select
          value={selectedId ?? ""}
          onChange={(e) => {
            const s = segments.find((s) => s.id === e.target.value);
            if (s) onSelect(s.id, s.name);
          }}
          className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
        >
          <option value="">Select segment...</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.contact_count} contacts)
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

const SEND_CHANNEL_MAP: Record<string, "email" | "sms" | "push"> = {
  send_email: "email",
  send_sms: "sms",
  send_push: "push",
};

function ActionConfig({
  data,
  onUpdate,
  onUpdateMultiple,
}: {
  data: ActionNodeData;
  onUpdate: (key: string, value: unknown) => void;
  onUpdateMultiple: (updates: Record<string, unknown>) => void;
}) {
  const channel = SEND_CHANNEL_MAP[data.action_type];

  if (channel) {
    return (
      <TemplatePicker
        channel={channel}
        selectedId={data.content_template_id}
        onSelect={(id, name) =>
          onUpdateMultiple({ content_template_id: id, template_name: name })
        }
      />
    );
  }

  // update_attribute
  return (
    <>
      <Field label="Attribute Key">
        <input
          type="text"
          value={data.attribute_key ?? ""}
          onChange={(e) => onUpdate("attribute_key", e.target.value)}
          placeholder="e.g. lifecycle_stage"
          className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
        />
      </Field>
      <Field label="Attribute Value">
        <input
          type="text"
          value={data.attribute_value ?? ""}
          onChange={(e) => onUpdate("attribute_value", e.target.value)}
          placeholder="e.g. vip"
          className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
        />
      </Field>
    </>
  );
}

function TemplatePicker({
  channel,
  selectedId,
  onSelect,
}: {
  channel: "email" | "sms" | "push";
  selectedId?: string;
  onSelect: (id: string, name: string) => void;
}) {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTemplates({ channel, status: "active" }).then((result) => {
      if (cancelled) return;
      if ("templates" in result) {
        setTemplates(result.templates);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [channel]);

  return (
    <Field label="Content Template">
      {loading ? (
        <p className="text-xs text-text-main-muted">Loading templates...</p>
      ) : templates.length === 0 ? (
        <p className="text-xs text-amber-600">
          No active {channel} templates found. Create one in Content first.
        </p>
      ) : (
        <select
          value={selectedId ?? ""}
          onChange={(e) => {
            const t = templates.find((t) => t.id === e.target.value);
            if (t) onSelect(t.id, t.name);
          }}
          className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
        >
          <option value="">Select template...</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.subject ? ` — ${t.subject}` : ""}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

function WaitConfig({
  data,
  onUpdate,
}: {
  data: WaitNodeData;
  onUpdate: (key: string, value: unknown) => void;
}) {
  return (
    <>
      <Field label="Wait Type">
        <select
          value={data.wait_type ?? "delay"}
          onChange={(e) => onUpdate("wait_type", e.target.value)}
          className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
        >
          <option value="delay">Fixed Delay</option>
          <option value="wait_for_event">Wait for Event</option>
        </select>
      </Field>

      {data.wait_type === "delay" || !data.wait_type ? (
        <div className="flex gap-2">
          <Field label="Amount">
            <input
              type="number"
              min={1}
              value={data.delay_amount ?? 1}
              onChange={(e) =>
                onUpdate("delay_amount", parseInt(e.target.value) || 1)
              }
              className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
            />
          </Field>
          <Field label="Unit">
            <select
              value={data.delay_unit ?? "hours"}
              onChange={(e) => onUpdate("delay_unit", e.target.value)}
              className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </Field>
        </div>
      ) : (
        <Field label="Wait for Event">
          <EventSelect
            value={data.wait_event_type ?? ""}
            onChange={(v) => onUpdate("wait_event_type", v)}
          />
        </Field>
      )}
    </>
  );
}

function ConditionConfig({
  data,
  onUpdate,
}: {
  data: ConditionNodeData;
  onUpdate: (key: string, value: unknown) => void;
}) {
  const fieldKeys = Object.keys(CONTACT_FIELDS);

  return (
    <>
      <Field label="Contact Field">
        <select
          value={data.field ?? ""}
          onChange={(e) => onUpdate("field", e.target.value)}
          className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
        >
          <option value="">Select field...</option>
          {fieldKeys.map((k) => (
            <option key={k} value={k}>
              {CONTACT_FIELDS[k].label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Operator">
        <select
          value={data.operator ?? "eq"}
          onChange={(e) => onUpdate("operator", e.target.value)}
          className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
        >
          <option value="eq">equals</option>
          <option value="neq">not equals</option>
          <option value="gt">greater than</option>
          <option value="gte">greater or equal</option>
          <option value="lt">less than</option>
          <option value="lte">less or equal</option>
          <option value="contains">contains</option>
          <option value="is_null">is empty</option>
          <option value="is_not_null">is not empty</option>
        </select>
      </Field>

      <Field label="Value">
        <input
          type="text"
          value={String(data.value ?? "")}
          onChange={(e) => onUpdate("value", e.target.value)}
          className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
        />
      </Field>
    </>
  );
}

function SplitConfig({
  data,
  onUpdate,
}: {
  data: SplitNodeData;
  onUpdate: (key: string, value: unknown) => void;
}) {
  const percent = data.split_a_percent ?? 50;

  return (
    <>
      <Field label={`Variant A: ${percent}%`}>
        <input
          type="range"
          min={10}
          max={90}
          step={5}
          value={percent}
          onChange={(e) =>
            onUpdate("split_a_percent", parseInt(e.target.value))
          }
          className="w-full accent-accent"
        />
        <div className="mt-1 flex justify-between text-xs text-text-main-muted">
          <span>A: {percent}%</span>
          <span>B: {100 - percent}%</span>
        </div>
      </Field>
    </>
  );
}

function ExitConfig({
  data,
  onUpdate,
}: {
  data: ExitNodeData;
  onUpdate: (key: string, value: unknown) => void;
}) {
  return (
    <Field label="Exit Reason">
      <input
        type="text"
        value={data.exit_reason ?? ""}
        onChange={(e) => onUpdate("exit_reason", e.target.value)}
        placeholder="e.g., journey_complete"
        className="w-full rounded-md border border-card-border px-3 py-1.5 text-sm text-text-main outline-none focus:border-accent"
      />
    </Field>
  );
}
