// ============================================================
// Segment types — shared across evaluator, API, actions, and UI.
// ============================================================

export type RuleOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "contains"
  | "is_null"
  | "is_not_null";

/** A single condition on a contact field */
export interface RuleCondition {
  type: "condition";
  field: string;
  operator: RuleOperator;
  value?: string | number | boolean | [string | number, string | number];
}

export type RuleCombinator = "and" | "or";

/**
 * A group of rules joined by a combinator.
 * Children can be conditions or nested groups — fully recursive.
 */
export interface RuleGroup {
  type: "group";
  combinator: RuleCombinator;
  children: RuleNode[];
}

/** A node in the rule tree: either a leaf condition or a nested group */
export type RuleNode = RuleCondition | RuleGroup;

export type SegmentStatus = "active" | "archived";

export interface Segment {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  rules: RuleGroup;
  status: SegmentStatus;
  contact_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSegmentInput {
  name: string;
  description?: string;
  rules: RuleGroup;
  created_by?: string;
}

export interface UpdateSegmentInput {
  name?: string;
  description?: string;
  rules?: RuleGroup;
  status?: SegmentStatus;
}

/**
 * Normalize any stored rules JSON into a RuleGroup.
 * Handles:
 *  - New recursive format: {type:"group", combinator, children}
 *  - Flat v2 format: {combinator, rules: [...conditions]}
 *  - Legacy v1 format: [...conditions] (plain array)
 */
export function normalizeRulesConfig(raw: unknown): RuleGroup {
  if (!raw) return { type: "group", combinator: "and", children: [] };

  // Already the new format
  if (isRuleGroup(raw)) return raw;

  // Flat v2 format: {combinator, rules}
  const obj = raw as Record<string, unknown>;
  if (obj && Array.isArray(obj.rules)) {
    return {
      type: "group",
      combinator: (obj.combinator as RuleCombinator) ?? "and",
      children: (obj.rules as Array<Record<string, unknown>>).map(legacyRuleToCondition),
    };
  }

  // Legacy v1: plain array of conditions
  if (Array.isArray(raw)) {
    return {
      type: "group",
      combinator: "and",
      children: (raw as Array<Record<string, unknown>>).map(legacyRuleToCondition),
    };
  }

  return { type: "group", combinator: "and", children: [] };
}

function isRuleGroup(raw: unknown): raw is RuleGroup {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as Record<string, unknown>).type === "group" &&
    Array.isArray((raw as Record<string, unknown>).children)
  );
}

function legacyRuleToCondition(r: Record<string, unknown>): RuleCondition {
  return {
    type: "condition",
    field: r.field as string,
    operator: r.operator as RuleOperator,
    value: r.value as RuleCondition["value"],
  };
}

/** Create a default empty condition */
export function defaultCondition(): RuleCondition {
  return { type: "condition", field: "lifecycle_stage", operator: "eq", value: "" };
}

/** Create a default empty group */
export function defaultGroup(): RuleGroup {
  return { type: "group", combinator: "and", children: [defaultCondition()] };
}

export interface ContactPreview {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  engagement_score: number;
  lifecycle_stage: string;
  total_orders: number;
  total_revenue: number;
  last_order_at: string | null;
}

export interface EvaluationResult {
  count: number;
  contacts: ContactPreview[];
}

/** All first-class contact columns available for segment rules */
export const CONTACT_FIELDS: Record<string, { type: "string" | "number" | "date" | "boolean"; label: string; category: string }> = {
  email: { type: "string", label: "Email", category: "Profile" },
  phone: { type: "string", label: "Phone", category: "Profile" },
  first_name: { type: "string", label: "First Name", category: "Profile" },
  last_name: { type: "string", label: "Last Name", category: "Profile" },
  external_id: { type: "string", label: "External ID", category: "Profile" },
  jurisdiction: { type: "string", label: "Jurisdiction", category: "Profile" },
  total_orders: { type: "number", label: "Total Orders", category: "Behavioral" },
  total_revenue: { type: "number", label: "Total Revenue", category: "Behavioral" },
  avg_order_value: { type: "number", label: "Avg Order Value", category: "Behavioral" },
  last_order_at: { type: "date", label: "Last Order", category: "Behavioral" },
  first_order_at: { type: "date", label: "First Order", category: "Behavioral" },
  engagement_score: { type: "number", label: "Engagement Score", category: "Engagement" },
  lifecycle_stage: { type: "string", label: "Lifecycle Stage", category: "Engagement" },
  last_email_open_at: { type: "date", label: "Last Email Open", category: "Engagement" },
  last_email_click_at: { type: "date", label: "Last Email Click", category: "Engagement" },
  email_consent: { type: "boolean", label: "Email Consent", category: "Consent" },
  sms_consent: { type: "boolean", label: "SMS Consent", category: "Consent" },
  created_at: { type: "date", label: "Created At", category: "Profile" },
};

/** Operators valid for each field type */
export const OPERATORS_BY_TYPE: Record<string, RuleOperator[]> = {
  string: ["eq", "neq", "contains", "is_null", "is_not_null"],
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "is_null", "is_not_null"],
  date: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "is_null", "is_not_null"],
  boolean: ["eq", "neq"],
};

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  eq: "equals",
  neq: "not equals",
  gt: "greater than",
  gte: "greater or equal",
  lt: "less than",
  lte: "less or equal",
  between: "between",
  contains: "contains",
  is_null: "is empty",
  is_not_null: "is not empty",
};
