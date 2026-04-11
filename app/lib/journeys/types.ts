// ============================================================
// Journey types — shared across API, actions, engine, and UI.
// ============================================================

export type JourneyStatus = "draft" | "active" | "paused" | "archived";
export type EnrollmentStatus = "active" | "waiting" | "completed" | "exited";
export type MessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "failed"
  | "suppressed";

export type NodeType =
  | "trigger"
  | "action"
  | "wait"
  | "condition"
  | "split"
  | "exit";

// ============================================================
// Core DB row interfaces
// ============================================================

export interface Journey {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  graph: JourneyGraph;
  status: JourneyStatus;
  trigger_config: TriggerConfig;
  entry_limit: number | null;
  re_entry_allowed: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface JourneyEnrollment {
  id: string;
  tenant_id: string;
  contact_id: string;
  journey_id: string;
  current_node_id: string | null;
  status: EnrollmentStatus;
  wait_until: string | null;
  entered_at: string;
  exit_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  tenant_id: string;
  contact_id: string;
  journey_enrollment_id: string | null;
  content_template_id: string | null;
  channel: "email" | "sms" | "push";
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  variant: string | null;
  status: MessageStatus;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  revenue_attributed: number;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DecisionLogEntry {
  id: string;
  tenant_id: string;
  contact_id: string;
  event_id: string | null;
  contact_snapshot: Record<string, unknown> | null;
  action_type: string;
  journey_id: string | null;
  enrollment_id: string | null;
  message_id: string | null;
  channel: string | null;
  decision_method: string;
  decision_reason: string | null;
  outcome_opened: boolean | null;
  outcome_clicked: boolean | null;
  outcome_converted: boolean | null;
  outcome_revenue: number | null;
  outcome_unsubscribed: boolean | null;
  decided_at: string;
}

// ============================================================
// React Flow compatible graph types
// ============================================================

export interface JourneyNodePosition {
  x: number;
  y: number;
}

export interface JourneyNode {
  id: string;
  type: NodeType;
  position: JourneyNodePosition;
  data: TriggerNodeData | ActionNodeData | WaitNodeData | ConditionNodeData | SplitNodeData | ExitNodeData;
}

export interface JourneyEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface JourneyGraph {
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

// ============================================================
// Per-node data interfaces
// ============================================================

export type TriggerType = "event" | "segment";

export interface TriggerConfig {
  trigger_type?: TriggerType;     // defaults "event" for backward compat
  event_type?: string;            // when trigger_type === "event"
  segment_id?: string;            // when trigger_type === "segment"
  segment_name?: string;          // denormalized display label
  scheduled_for?: string;         // ISO 8601 datetime — null means "send now"
  scheduled_timezone?: string;    // e.g. "America/New_York"
  enrollment_status?: "pending" | "completed" | "failed";  // track batch progress
  conditions?: Record<string, unknown>[];
}

export interface TriggerNodeData {
  label: string;
  trigger_type?: TriggerType;
  event_type?: string;
  segment_id?: string;
  segment_name?: string;
  conditions?: Record<string, unknown>[];
}

export type ActionType = "send_email" | "send_sms" | "send_push" | "update_attribute";

export interface ActionNodeData {
  label: string;
  action_type: ActionType;
  content_template_id?: string;
  template_name?: string;
  attribute_key?: string;
  attribute_value?: string;
}

export type WaitType = "delay" | "wait_for_event";

export interface WaitNodeData {
  label: string;
  wait_type: WaitType;
  delay_amount?: number;
  delay_unit?: "minutes" | "hours" | "days";
  wait_event_type?: string;
  timeout_hours?: number;
}

export interface ConditionNodeData {
  label: string;
  field: string;
  operator: string;
  value: string | number | boolean;
}

export interface SplitNodeData {
  label: string;
  split_a_percent: number;
  variant_a_name?: string;
  variant_b_name?: string;
}

export interface ExitNodeData {
  label: string;
  exit_reason?: string;
}

// ============================================================
// Input types
// ============================================================

export interface CreateJourneyInput {
  name: string;
  description?: string;
  graph?: JourneyGraph;
  trigger_config?: TriggerConfig;
  entry_limit?: number;
  re_entry_allowed?: boolean;
  created_by?: string;
}

export interface UpdateJourneyInput {
  name?: string;
  description?: string;
  graph?: JourneyGraph;
  trigger_config?: TriggerConfig;
  entry_limit?: number;
  re_entry_allowed?: boolean;
}

export interface ListJourneysOptions {
  status?: JourneyStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================================
// Stats
// ============================================================

export interface JourneyStats {
  enrolled: number;
  active: number;
  completed: number;
  exited: number;
  conversion_rate: number;
}

// ============================================================
// Display config
// ============================================================

export const JOURNEY_STATUS_CONFIG: Record<
  JourneyStatus,
  { label: string; color: string }
> = {
  draft: { label: "Draft", color: "#94A3B8" },
  active: { label: "Active", color: "#10B981" },
  paused: { label: "Paused", color: "#F59E0B" },
  archived: { label: "Archived", color: "#64748B" },
};

export const TRIGGER_EVENT_TYPES: { value: string; label: string; category: string }[] = [
  { value: "customer.created", label: "New Customer", category: "Customer" },
  { value: "customer.updated", label: "Customer Updated", category: "Customer" },
  { value: "order.placed", label: "Order Placed", category: "Orders" },
  { value: "order.fulfilled", label: "Order Fulfilled", category: "Orders" },
  { value: "order.cancelled", label: "Order Cancelled", category: "Orders" },
  { value: "checkout.started", label: "Checkout Started", category: "Cart" },
  { value: "checkout.updated", label: "Checkout Updated", category: "Cart" },
  { value: "cart.abandoned", label: "Cart Abandoned", category: "Cart" },
  { value: "email.delivered", label: "Email Delivered", category: "Email" },
  { value: "email.opened", label: "Email Opened", category: "Email" },
  { value: "email.clicked", label: "Email Clicked", category: "Email" },
  { value: "email.bounced", label: "Email Bounced", category: "Email" },
  { value: "email.unsubscribed", label: "Email Unsubscribed", category: "Email" },
  { value: "sms.delivered", label: "SMS Delivered", category: "SMS" },
  { value: "sms.failed", label: "SMS Failed", category: "SMS" },
];

export const NODE_TYPE_CONFIG: Record<
  NodeType,
  { label: string; color: string; icon: string }
> = {
  trigger: { label: "Entry", color: "#10B981", icon: "Zap" },
  action: { label: "Action", color: "#3B82F6", icon: "Send" },
  wait: { label: "Wait", color: "#F59E0B", icon: "Clock" },
  condition: { label: "Condition", color: "#F97316", icon: "GitBranch" },
  split: { label: "Split", color: "#8B5CF6", icon: "Scissors" },
  exit: { label: "Exit", color: "#EF4444", icon: "Flag" },
};
