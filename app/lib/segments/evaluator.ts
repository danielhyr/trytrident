/**
 * Segment rule evaluator — builds Supabase query from recursive rule tree.
 *
 * Pure function: takes (admin, tenantId, ruleGroup) → EvaluationResult.
 * Supports nested AND/OR groups via PostgREST filter syntax.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RuleGroup,
  RuleNode,
  RuleCondition,
  EvaluationResult,
  ContactPreview,
} from "./types";
import { CONTACT_FIELDS, normalizeRulesConfig } from "./types";

const PREVIEW_COLUMNS =
  "id, email, first_name, last_name, engagement_score, lifecycle_stage, total_orders, total_revenue, last_order_at";

/**
 * Validate a rule group recursively.
 * Returns null if valid, or an error message string.
 */
export function validateRules(group: RuleGroup): string | null {
  if (!group.children || group.children.length === 0) {
    return "At least one rule is required";
  }

  for (let i = 0; i < group.children.length; i++) {
    const node = group.children[i];
    if (node.type === "group") {
      const err = validateRules(node);
      if (err) return err;
    } else {
      const err = validateCondition(node, i);
      if (err) return err;
    }
  }

  return null;
}

function validateCondition(rule: RuleCondition, index: number): string | null {
  if (!rule.field || !rule.operator) {
    return `Rule ${index + 1}: field and operator are required`;
  }

  const isCustom = rule.field.startsWith("custom_attributes.");
  if (!isCustom && !CONTACT_FIELDS[rule.field]) {
    return `Rule ${index + 1}: unknown field "${rule.field}"`;
  }

  if (rule.operator === "is_null" || rule.operator === "is_not_null") return null;

  if (rule.operator === "between") {
    if (!Array.isArray(rule.value) || rule.value.length !== 2) {
      return `Rule ${index + 1}: "between" requires a [min, max] value`;
    }
    return null;
  }

  if (rule.value === undefined || rule.value === null || rule.value === "") {
    return `Rule ${index + 1}: value is required for operator "${rule.operator}"`;
  }

  return null;
}

/**
 * Evaluate a rule group against the contact table.
 * Accepts RuleGroup or any legacy format (auto-normalized).
 */
export async function evaluateRules(
  admin: SupabaseClient,
  tenantId: string,
  rawGroup: RuleGroup | unknown,
  options?: { limit?: number; offset?: number; countOnly?: boolean; contactId?: string }
): Promise<EvaluationResult> {
  const group = (rawGroup as RuleGroup)?.type === "group"
    ? (rawGroup as RuleGroup)
    : normalizeRulesConfig(rawGroup);
  const limit = options?.limit ?? 10;
  const offset = options?.offset ?? 0;
  const countOnly = options?.countOnly ?? false;

  // Build PostgREST filter string from the recursive tree
  const filterStr = groupToFilter(group);

  // Count query
  let countQuery = admin
    .from("contact")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (filterStr) countQuery = countQuery.or(filterStr);
  if (options?.contactId) countQuery = countQuery.eq("id", options.contactId);

  const { count, error: countError } = await countQuery;
  if (countError) throw new Error(`Evaluation failed: ${countError.message}`);

  if (countOnly) return { count: count ?? 0, contacts: [] };

  // Data query
  let dataQuery = admin
    .from("contact")
    .select(PREVIEW_COLUMNS)
    .eq("tenant_id", tenantId)
    .order("engagement_score", { ascending: false })
    .range(offset, offset + limit - 1);
  if (filterStr) dataQuery = dataQuery.or(filterStr);
  if (options?.contactId) dataQuery = dataQuery.eq("id", options.contactId);

  const { data, error: dataError } = await dataQuery;
  if (dataError) throw new Error(`Evaluation failed: ${dataError.message}`);

  return {
    count: count ?? 0,
    contacts: (data ?? []) as ContactPreview[],
  };
}

/**
 * Recursively convert a RuleGroup into a PostgREST filter string.
 *
 * PostgREST supports nested and()/or() in filter strings:
 *   and(email.neq.null,or(lifecycle_stage.eq.active,lifecycle_stage.eq.vip))
 *
 * A top-level group is wrapped in and() or or() and passed to .or() which
 * PostgREST parses as a single expression.
 */
function groupToFilter(group: RuleGroup): string {
  if (group.children.length === 0) return "";

  const parts = group.children
    .map((node) => nodeToFilter(node))
    .filter(Boolean);

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];

  return `${group.combinator}(${parts.join(",")})`;
}

function nodeToFilter(node: RuleNode): string {
  if (node.type === "group") return groupToFilter(node);
  return conditionToFilter(node);
}

function conditionToFilter(rule: RuleCondition): string {
  const field = rule.field.startsWith("custom_attributes.")
    ? rule.field.replace("custom_attributes.", "custom_attributes->>")
    : rule.field;
  const { operator, value } = rule;

  switch (operator) {
    case "eq":
      return `${field}.eq.${value}`;
    case "neq":
      return `${field}.neq.${value}`;
    case "gt":
      return `${field}.gt.${value}`;
    case "gte":
      return `${field}.gte.${value}`;
    case "lt":
      return `${field}.lt.${value}`;
    case "lte":
      return `${field}.lte.${value}`;
    case "between": {
      const [min, max] = value as [string | number, string | number];
      return `and(${field}.gte.${min},${field}.lte.${max})`;
    }
    case "contains":
      return `${field}.ilike.%${value}%`;
    case "is_null":
      return `${field}.is.null`;
    case "is_not_null":
      return `${field}.not.is.null`;
    default:
      return "";
  }
}
